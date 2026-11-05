import OpenAI from 'openai';
import { web } from './slackClient';
import {
  getUserNameHash,
  resolveUserMentions,
  formatTranscript,
  isJeremyMessage,
  markdownToSlack,
  fetchConversationHistory,
} from './util';
import { getSelf } from './self';
import { addReactionOnce } from './reactionUtils';
import * as people from './people';
import { SlackMessageEvent } from './types';

const HISTORY_LIMIT = 50;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getChatbot = async (
  event: SlackMessageEvent,
  query: string
): Promise<void> => {
  console.log({ event });
  await addReactionOnce(event.channel, event.ts, 'thinking_face');
  try {
    // Get user mappings for better context
    const userHash = await getUserNameHash();
    const self = getSelf();

    const channelHistory = await fetchConversationHistory(event, HISTORY_LIMIT);

    const formattedHistory = formatTranscript(channelHistory, userHash, self);

    const isContinuation =
      Boolean(event.thread_ts) ||
      channelHistory.some((m) => isJeremyMessage(m, self));

    const currentUserName =
      userHash[event.user!] || event.username || event.user || 'user';
    const resolvedQuery = resolveUserMentions(query, userHash);
    const setting = event.thread_ts
      ? 'this Slack thread (the whole thread, oldest first)'
      : 'this Slack channel';
    const prompt = `Here is recent conversation history from ${setting} (most recent last):\n${formattedHistory}\n\n${currentUserName}: ${resolvedQuery}\nJeremy:`;

    const peopleDict = people.all();
    const peopleContext = Object.keys(peopleDict).length
      ? '\n\nPeople you know: ' +
        Object.entries(peopleDict)
          .map(([n, d]) => `${n} is ${d}`)
          .join('; ') +
        '.'
      : '';

    const response = await openai.responses.create({
      model: 'gpt-5.6-luna',
      tools: [{ type: 'web_search_preview' }],
      instructions:
        'You are Jeremy, a guy in a Slack group chat. You are helpful and often respond with stupid puns. ' +
        'Always respond directly as yourself — never draft responses for others, never say "I\'d answer with something like", never offer to help compose a reply. ' +
        'Just answer the question or respond to the conversation naturally. ' +
        'Do not offer follow-up actions like "If you want, I can..." — just give your answer. ' +
        'Always read the conversation history carefully before responding — short messages like "source", "proof", or "really?" refer to what was just said. ' +
        'If asked for a source, search the web for citations backing up your previous claims. ' +
        'When relaying factual information, never invent details and present them as fact — every claim stated as fact must be real. Jokes are welcome, but keep them clearly jokes (commentary, asides), not fabricated facts mixed in with the true ones.' +
        (isContinuation
          ? ' This is a continuation of an ongoing conversation. Do not greet, do not reintroduce yourself, and do not restate your name. '
          : ' If appropriate, you may briefly remind people that your name is Jeremy.') +
        peopleContext,
      input: prompt,
    });
    console.log(response);

    const cleaned = markdownToSlack(response.output_text);

    await web.chat.postMessage({
      text: cleaned,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  } catch (e: any) {
    console.log('err', e);
    await web.chat.postMessage({
      text: `error sry: ${e.message}`,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  }
};

export default getChatbot;

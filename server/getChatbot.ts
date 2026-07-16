import OpenAI from 'openai';
import { web } from './slackClient';
import { getUsers, markdownToSlack } from './util';
import { getSelf } from './self';
import { addReactionOnce } from './reactionUtils';
import messageHistory from './messageHistory';
import * as people from './people';
import { SlackMessageEvent } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getChatbot = async (
  event: SlackMessageEvent,
  query: string
): Promise<void> => {
  console.log({ event });
  await addReactionOnce(event.channel, event.ts, 'thinking_face');
  try {
    // Get user mappings for better context
    const users = await getUsers();
    const userHash = users.reduce((prev, curr) => {
      prev[curr.id] = curr.name;
      return prev;
    }, {} as Record<string, string>);

    const self = getSelf();

    // Build channel-specific history context
    const channelHistory = (messageHistory[event.channel] || [])
      .filter((m) => !!m && typeof m.text === 'string')
      .slice(0, 10)
      .reverse();

    const formattedHistory = channelHistory
      .map((m) => {
        const isJeremy =
          m.subtype === 'bot_message' &&
          (m.user === self?.id ||
            m.username?.toLowerCase() === self?.name.toLowerCase());
        const author = isJeremy
          ? 'Jeremy'
          : userHash[m.user!] || m.username || m.user || 'user';
        return `${author}: ${m.text}`;
      })
      .join('\n');

    const isContinuation =
      Boolean(event.thread_ts) ||
      channelHistory.some(
        (m) =>
          m &&
          m.subtype === 'bot_message' &&
          (m.user === self?.id ||
            m.username?.toLowerCase() === self?.name.toLowerCase())
      );

    const currentUserName =
      userHash[event.user!] || event.username || event.user || 'user';
    const prompt = `Here is recent conversation history from this Slack channel (most recent last):\n${formattedHistory}\n\n${currentUserName}: ${query}\nJeremy:`;

    const peopleDict = people.all();
    const peopleContext = Object.keys(peopleDict).length
      ? '\n\nPeople you know: ' +
        Object.entries(peopleDict)
          .map(([n, d]) => `${n} is ${d}`)
          .join('; ') +
        '.'
      : '';

    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      tools: [{ type: 'web_search_preview' }],
      instructions:
        'You are Jeremy, a guy in a Slack group chat. You are helpful and often respond with stupid puns. ' +
        'Always respond directly as yourself — never draft responses for others, never say "I\'d answer with something like", never offer to help compose a reply. ' +
        'Just answer the question or respond to the conversation naturally. ' +
        'Do not offer follow-up actions like "If you want, I can..." — just give your answer.' +
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

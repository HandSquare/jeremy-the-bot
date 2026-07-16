import OpenAI from 'openai';
import { web, userWeb } from './slackClient';
import { getUserNameHash, formatTranscript, markdownToSlack } from './util';
import { getSelf } from './self';
import { addReactionOnce } from './reactionUtils';
import messageHistory from './messageHistory';
import { SlackMessage, SlackMessageEvent } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_HISTORY = 100;
const GAP_THRESHOLD_SEC = 10 * 60 * 60; // 10 hours

const buildConversationContext = async (
  event: SlackMessageEvent
): Promise<string> => {
  const userHash = await getUserNameHash();
  const self = getSelf();

  let messages: SlackMessage[];
  try {
    if (event.thread_ts) {
      const result = await userWeb.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts,
        limit: MAX_HISTORY,
      });
      messages = (result.messages || []) as SlackMessage[];
    } else {
      const result = await userWeb.conversations.history({
        channel: event.channel,
        limit: MAX_HISTORY,
      });
      messages = ((result.messages || []) as SlackMessage[])
        .filter((m) => !m.thread_ts)
        .reverse();
    }
  } catch (e: any) {
    console.log('sanityCheck history fetch error', e.message, e.data);
    messages = (messageHistory[event.channel] || []).slice().reverse();
  }

  const filtered = messages.filter(
    (m) => !!m && typeof m.text === 'string' && m.ts !== event.ts
  );

  const recent: SlackMessage[] = [];
  for (let i = filtered.length - 1; i >= 0; i--) {
    const next = filtered[i + 1];
    if (next) {
      const gap = parseFloat(next.ts) - parseFloat(filtered[i].ts);
      if (gap > GAP_THRESHOLD_SEC) break;
    }
    recent.unshift(filtered[i]);
  }

  return formatTranscript(recent, userHash, self);
};

const sanityCheck = async (
  event: SlackMessageEvent,
  targetChannel?: string | null
): Promise<void> => {
  await addReactionOnce(event.channel, event.ts, 'mag');

  const queryEvent = targetChannel
    ? { ...event, channel: targetChannel, thread_ts: undefined }
    : event;

  try {
    const conversation = await buildConversationContext(queryEvent);

    if (!conversation.trim()) {
      await web.chat.postMessage({
        text: "there's nothing to sanity check — the conversation is empty",
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
      return;
    }

    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      tools: [{ type: 'web_search_preview' }],
      instructions:
        'You are Jeremy, a helpful Slack bot doing a sanity check on a conversation. ' +
        'First, identify each person in the conversation and summarize their position or viewpoint in one line each. ' +
        'Present this as a quick rundown so everyone can see how their arguments are being understood.\n\n' +
        'Then, use web search to verify any factual claims, statistics, or assertions made in the conversation. ' +
        'Do not say you "can\'t verify" something — you have web search, so look it up. ' +
        'For each claim you check:\n' +
        '- Attribute it to whoever said it\n' +
        '- Say whether it appears to be accurate, inaccurate, or mixed/unverifiable\n' +
        '- Cite sources using Slack link syntax: <https://example.com|Source Name> (angle brackets, URL first, pipe, then label). Do NOT use markdown link syntax like [text](url). NEVER use internal citation markers like 【turnXsearchY】.\n' +
        '- If something seems off, gently note it\n\n' +
        'Finally, scan the conversation for logical fallacies (strawman, ad hominem, ' +
        'false dichotomy, slippery slope, appeal to authority, etc.). ' +
        'If anyone is using one, always start with who said it (e.g. "bob used a *strawman*"), then briefly explain the flaw. ' +
        'Be playful but fair — roast the reasoning, not the person.\n\n' +
        'Note: lines starting with > are Slack blockquotes — the person is quoting someone else, not stating their own view.\n\n' +
        'Keep it casual and concise — this is Slack, not a research paper. ' +
        'Do not offer to do follow-up passes or additional analysis. ' +
        'Use Slack formatting (*bold* for emphasis, no headers). ' +
        'If the conversation had no verifiable claims, just say so briefly.',
      input: `Here is the recent conversation to sanity check:\n\n${conversation}`,
    });

    const cleaned = markdownToSlack(response.output_text);

    await web.chat.postMessage({
      text: cleaned,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  } catch (e: any) {
    console.log('sanityCheck error', e);
    await web.chat.postMessage({
      text: `couldn't complete the sanity check: ${e.message}`,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  }
};

export default sanityCheck;

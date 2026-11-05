import OpenAI from 'openai';
import { web } from './slackClient';
import {
  getCurrentAtWork,
  getUserNameHash,
  formatTranscript,
  resolveUserMentions,
  fetchConversationHistory,
} from './util';
import { getSelf } from './self';
import * as people from './people';
import { getSearchImage, isImageUrl } from './performGoogleSearch';
import { SlackMessageEvent } from './types';

// Enough recent messages to resolve "that"/"him"/"the one from earlier"
// without bloating the web-search prompt.
const HISTORY_LIMIT = 20;
const MODEL = 'gpt-5.6-luna';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const buildPrompt = async (
  event: SlackMessageEvent,
  query: string
): Promise<string> => {
  const [userHash, history] = await Promise.all([
    getUserNameHash(),
    fetchConversationHistory(event, HISTORY_LIMIT),
  ]);
  const transcript = formatTranscript(history, userHash, getSelf());
  const request = people.resolveImagePrompt(
    resolveUserMentions(query, userHash)
  );
  return `Recent Slack conversation (most recent last), for context:\n${transcript}\n\nSomeone asked to pull up an image of: "${request}"`;
};

const askGptForImage = async (
  event: SlackMessageEvent,
  query: string,
  atWork: boolean
): Promise<string | null> => {
  const response = await openai.responses.create({
    model: MODEL,
    tools: [{ type: 'web_search' }],
    instructions:
      'Find one direct image URL (the image file itself, not a web page) that best shows what was asked for. ' +
      'Use the conversation only to resolve what the request refers to. ' +
      (atWork ? 'Keep it safe for work. ' : '') +
      'Reply with only the URL.',
    input: await buildPrompt(event, query),
  });
  const url = response.output_text.trim();
  return url.startsWith('http') ? url : null;
};

/** "pull up X": GPT web search with chat context, falling back to Google. */
export const performGptImageSearch = async (
  event: SlackMessageEvent,
  query: string
): Promise<void> => {
  const atWork = (await getCurrentAtWork()) > 0;

  let imgUrl: string | null = null;
  try {
    const candidate = await askGptForImage(event, query, atWork);
    if (candidate && (await isImageUrl(candidate))) imgUrl = candidate;
    else console.log('pull-up: GPT gave no usable image', { candidate });
  } catch (e) {
    console.log('pull-up: GPT search failed', e);
  }

  imgUrl ??= await getSearchImage(query, atWork);
  if (!imgUrl) return;

  await web.chat.postMessage({
    channel: event.channel,
    text: imgUrl,
    thread_ts: event.thread_ts,
  });
};

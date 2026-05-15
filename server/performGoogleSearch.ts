import { customsearch } from '@googleapis/customsearch';
import { web } from './slackClient';
import { getCurrentAtWork } from './util';
import { SlackMessageEvent } from './types';

const apiKey = process.env.GOOGLE_SEARCH_KEY;
const customSearchId = process.env.GOOGLE_SEARCH_ID;

const search = customsearch('v1');

const isReachable = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const getSearchImage = async (
  query: string,
  atWork: boolean
): Promise<string | null> => {
  const res = await search.cse.list({
    cx: customSearchId,
    q: query,
    auth: apiKey,
    searchType: 'image',
    safe: atWork ? 'active' : 'off',
  });

  const items = res.data.items || [];
  for (const item of items) {
    if (await isReachable(item.link!)) return item.link!;
  }
  return items[0]?.link || null;
};

const getSearchText = async (
  query: string
): Promise<{ title: string; link: string; snippet: string }> => {
  // read db to see who is at work
  const res = await search.cse.list({
    cx: customSearchId,
    q: query,
    auth: apiKey,
  });

  const { title, link, snippet } = res.data.items![0];
  return {
    title: title!,
    link: link!,
    snippet: snippet!,
  };
};

export const performGoogleImageSearch = async (
  event: SlackMessageEvent,
  query: string
): Promise<void> => {
  const atWork = (await getCurrentAtWork()) > 0;
  const imgUrl = await getSearchImage(query, atWork);
  web.chat.postMessage({
    channel: event.channel,
    text: imgUrl!,
    thread_ts: event.thread_ts,
  });
};

export const performGoogleTextSearch = async (
  event: SlackMessageEvent,
  query: string
): Promise<void> => {
  const { title, link, snippet } = await getSearchText(query);
  web.chat.postMessage({
    channel: event.channel,
    text: `<${link}|*${title}*>\n>${snippet}`,
    thread_ts: event.thread_ts,
  });
};

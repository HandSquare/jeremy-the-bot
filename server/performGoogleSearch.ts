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

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  date: string | null;
}

const METATAG_DATE_KEYS = [
  'article:published_time',
  'datepublished',
  'og:article:published_time',
  'date',
  'publish_date',
];

const SNIPPET_DATE_RE = /^([A-Z][a-z]{2} \d{1,2}, \d{4})\s[—–-]/;

const extractDate = (item: any): string | null => {
  const metatags = item.pagemap?.metatags?.[0] as
    | Record<string, string>
    | undefined;
  if (metatags) {
    for (const key of METATAG_DATE_KEYS) {
      const val = metatags[key];
      if (val) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
      }
    }
  }
  const snippetMatch = item.snippet?.match(SNIPPET_DATE_RE);
  if (snippetMatch) return snippetMatch[1];
  return null;
};

const getSearchText = async (query: string): Promise<SearchResult> => {
  const results = await getSearchResults(query, 1);
  return results[0];
};

export const getSearchResults = async (
  query: string,
  num = 3
): Promise<SearchResult[]> => {
  const res = await search.cse.list({
    cx: customSearchId,
    q: query,
    auth: apiKey,
    num,
  });

  return (res.data.items || []).slice(0, num).map((item) => ({
    title: item.title!,
    link: item.link!,
    snippet: item.snippet!,
    date: extractDate(item),
  }));
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

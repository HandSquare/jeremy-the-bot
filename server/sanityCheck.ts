import OpenAI from 'openai';
import { web } from './slackClient';
import { getUsers } from './util';
import { getSelf } from './self';
import messageHistory from './messageHistory';
import { getSearchResults, SearchResult } from './performGoogleSearch';
import { SlackMessageEvent } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HISTORY_DEPTH = 15;

const buildConversationContext = async (
  event: SlackMessageEvent
): Promise<string> => {
  const users = await getUsers();
  const userHash = users.reduce((prev, curr) => {
    prev[curr.id] = curr.name;
    return prev;
  }, {} as Record<string, string>);

  const self = getSelf();
  const channelHistory = (messageHistory[event.channel] || [])
    .filter((m) => !!m && typeof m.text === 'string' && m.ts !== event.ts)
    .slice(0, HISTORY_DEPTH)
    .reverse();

  return channelHistory
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
};

const extractClaims = async (conversation: string): Promise<string[]> => {
  const response = await openai.responses.create({
    model: 'gpt-5.4-mini',
    instructions:
      'You extract factual claims from conversations that can be verified with a web search. ' +
      'Return ONLY a JSON array of short search query strings. ' +
      'Focus on verifiable factual claims, statistics, or assertions — skip opinions, jokes, and greetings. ' +
      'If there are no verifiable claims, return an empty array. ' +
      'Return raw JSON only, no markdown fences.',
    input: conversation,
  });

  try {
    const parsed = JSON.parse(response.output_text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const synthesize = async (
  conversation: string,
  searchData: { claim: string; results: SearchResult[] }[]
): Promise<string> => {
  const searchContext = searchData
    .map(
      ({ claim, results }) =>
        `Claim: "${claim}"\n` +
        results
          .map((r) => {
            const datePart = r.date ? ` [${r.date}]` : '';
            return `  - ${r.title}${datePart}: ${r.snippet} (${r.link})`;
          })
          .join('\n')
    )
    .join('\n\n');

  const response = await openai.responses.create({
    model: 'gpt-5.4-mini',
    instructions:
      'You are Jeremy, a helpful Slack bot doing a sanity check on a conversation. ' +
      'You have been given the recent conversation and web search results for key claims made in it. ' +
      'Your job is to provide a brief, conversational fact-check. For each claim you checked:\n' +
      '- Say whether it appears to be accurate, inaccurate, or mixed/unverifiable based on the search results\n' +
      '- Cite a relevant source link and its date when available\n' +
      '- If something seems off, gently note it\n\n' +
      'Also scan the conversation for logical fallacies (strawman, ad hominem, ' +
      'false dichotomy, slippery slope, appeal to authority, etc.). ' +
      'If anyone is using one, call it out by name and briefly explain why their argument has that flaw. ' +
      'Be playful but fair — roast the reasoning, not the person.\n\n' +
      'Keep it casual and concise — this is Slack, not a research paper. ' +
      'Use Slack formatting (*bold* for emphasis, no headers). ' +
      'If the conversation had no verifiable claims, just say so briefly.',
    input:
      `Recent conversation:\n${conversation}\n\n` +
      `Search results:\n${searchContext}`,
  });

  return response.output_text;
};

const sanityCheck = async (event: SlackMessageEvent): Promise<void> => {
  await web.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'mag',
  });

  try {
    const conversation = await buildConversationContext(event);

    if (!conversation.trim()) {
      await web.chat.postMessage({
        text: "there's nothing to sanity check — the conversation is empty",
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
      return;
    }

    const claims = await extractClaims(conversation);

    if (claims.length === 0) {
      await web.chat.postMessage({
        text: "i don't see any verifiable claims in the recent conversation — seems like vibes only",
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
      return;
    }

    const searchData = await Promise.all(
      claims.map(async (claim) => ({
        claim,
        results: await getSearchResults(claim, 3),
      }))
    );

    const response = await synthesize(conversation, searchData);

    await web.chat.postMessage({
      text: response,
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

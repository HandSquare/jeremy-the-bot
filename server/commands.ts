import { removeStopwords } from 'stopword';
import { web, userWeb } from './slackClient';
import messageHistory from './messageHistory';
import { addReactionOnce } from './reactionUtils';
import {
  extractImgUrl,
  getCurrentAtWork,
  getUsersCurrentlyAtWork,
  isJeremyMessage,
  makeNiceListFromArray,
} from './util';
import { updateState } from './db';
import { getSelf } from './self';

import * as people from './people';

import sendPageScreenshot from './sendPageScreenshot';
import getDallEImage from './getDallEImage';
import getImageEdit from './getImageEdit';
import getVideo from './getVideo';
import getChatbot from './getChatbot';
import {
  performGoogleImageSearch,
  performGoogleTextSearch,
} from './performGoogleSearch';
import describeImage from './describeImage';
import sanityCheck from './sanityCheck';
import { SlackMessageEvent, SlackMessage, Command } from './types';

// ----- helpers -----

const messageHasImage = (msg: SlackMessageEvent | SlackMessage): boolean =>
  !!(
    msg &&
    msg.files &&
    msg.files.some((f) => (f.mimetype || '').startsWith('image/'))
  );

// How far back to look when hunting for a previous image/link/text message.
const HISTORY_LOOKBACK_LIMIT = 50;

const VIDEO_URL_PATTERNS = [
  /instagram\.com\/(?:reel|reels|p)\/[\w-]+/i,
  /(?:vm|vt|www|m)?\.?tiktok\.com\//i,
  /(?:x|twitter)\.com\/[^/]+\/status\/\d+/i,
];

const findVideoUrl = (text: string): string | null => {
  if (!text) return null;
  const matches = [...text.matchAll(/<(https?:\/\/[^>|]+)(?:\|[^>]*)?>/g)];
  for (const m of matches) {
    if (VIDEO_URL_PATTERNS.some((p) => p.test(m[1]))) return m[1];
  }
  return null;
};

const findLastMessageMatching = async (
  event: SlackMessageEvent,
  predicate: (msg: SlackMessage) => boolean,
  { includeSelf = false } = {}
): Promise<SlackMessage | null> => {
  const selfId = getSelf()?.id;
  const inThread = !!event.thread_ts;
  const isCandidate = (msg: SlackMessage) => {
    if (msg.ts === event.ts) return false;
    if (!includeSelf && (msg.bot_id || msg.user === selfId)) return false;
    if (inThread) {
      return msg.thread_ts === event.thread_ts || msg.ts === event.thread_ts;
    }
    return !msg.thread_ts;
  };

  const local = (messageHistory[event.channel] || []).find(
    (m) => isCandidate(m) && predicate(m)
  );
  if (local) return local;

  try {
    if (inThread) {
      const result = await web.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts!,
        limit: HISTORY_LOOKBACK_LIMIT,
      });
      const messages = (result.messages || []) as SlackMessage[];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (isCandidate(messages[i]) && predicate(messages[i]))
          return messages[i];
      }
    } else {
      const result = await web.conversations.history({
        channel: event.channel,
        limit: HISTORY_LOOKBACK_LIMIT,
      });
      const messages = (result.messages || []) as SlackMessage[];
      for (const msg of messages) {
        if (isCandidate(msg) && !msg.thread_ts && predicate(msg)) return msg;
      }
    }
  } catch (e: any) {
    console.log('findLastMessageMatching fetch error', e.message);
  }
  return null;
};

const findLastImageMessage = (
  event: SlackMessageEvent
): Promise<SlackMessage | null> =>
  findLastMessageMatching(event, messageHasImage, { includeSelf: true });

const LINK_REGEX =
  /<(https?:\/\/[\w-]+(?:\.[\w]+)+(?:\/[\w-?=%&@$#_.+]+)*\/?)(?:\|((?:[^>])+))?>/;

const messageLink = (msg: SlackMessage): string | null => {
  const text = msg.text || msg.message?.text;
  const m = text?.match(LINK_REGEX);
  return m ? m[1] : null;
};

const findLastLinkMessage = (
  event: SlackMessageEvent
): Promise<SlackMessage | null> =>
  findLastMessageMatching(event, (msg) => !!messageLink(msg));

const findLastTextMessage = (
  event: SlackMessageEvent
): Promise<SlackMessage | null> =>
  findLastMessageMatching(
    event,
    (msg) => typeof msg.text === 'string' && !!msg.text,
    { includeSelf: true }
  );

// ----- commands -----
//
// Each command: { name, match, handle, [skipsAmbient] }.
// `match(event)` returns a truthy value (regex match, object, true) or null.
// `handle(event, matchResult)` runs the side effect.
// First match wins. Order matters: more specific patterns must come before
// looser fallbacks (e.g. `, edit` before `jeremy, X`).

const COMMANDS: Command[] = [
  {
    name: 'video-url',
    skipsAmbient: true,
    match: (event) => {
      if (event.subtype === 'bot_message') return null;
      const url = findVideoUrl(event.text);
      return url ? { url } : null;
    },
    handle: (event, ctx) => getVideo(event, ctx.url),
  },
  {
    name: 'what-means',
    match: (event) => event.text.match(/[Ww]hat means (.*)/),
    handle: async (event, m) => {
      await addReactionOnce(event.channel, event.ts, 'eyes');
      await performGoogleImageSearch(event, m[1]);
    },
  },
  {
    name: 'pull-up-either',
    match: (event) => event.text.match(/, pull up (.*) or (.*)/),
    handle: async (event, m) => {
      await addReactionOnce(event.channel, event.ts, 'eyes');
      await addReactionOnce(event.channel, event.ts, 'game_die');
      const idx = Math.random() > 0.5 ? 1 : 2;
      performGoogleImageSearch(event, m[idx]);
    },
  },
  {
    name: 'pull-up',
    match: (event) => event.text.match(/, pull up (.*)/),
    handle: async (event, m) => {
      await addReactionOnce(event.channel, event.ts, 'eyes');
      performGoogleImageSearch(event, m[1]);
    },
  },
  {
    name: 'generate-that',
    match: (event) =>
      event.text.toLowerCase().includes(', generate that') ? true : null,
    handle: async (event) => {
      const lastMessage = await findLastTextMessage(event);
      if (!lastMessage) return;
      getDallEImage(
        event,
        people.substitute(lastMessage.text!),
        lastMessage.text!
      );
    },
  },
  {
    name: 'generate',
    match: (event) => event.text.match(/, generate (.*)/),
    handle: (event, m) => {
      const original = m[1];
      const prompt = people.substitute(original);
      if (messageHasImage(event)) getImageEdit(event, event, prompt, original);
      else getDallEImage(event, prompt, original);
    },
  },
  {
    name: 'edit',
    match: (event) => event.text.match(/, edit (.*)/i),
    handle: async (event, m) => {
      const sourceMessage = messageHasImage(event)
        ? event
        : await findLastImageMessage(event);
      if (!sourceMessage) {
        await web.chat.postMessage({
          text: "i don't see an image to edit",
          channel: event.channel,
          thread_ts: event.thread_ts,
        });
        return;
      }
      const original = m[1];
      getImageEdit(
        event,
        sourceMessage,
        `edit ${people.substitute(original)}`,
        original
      );
    },
  },
  {
    name: 'define',
    match: (event) =>
      event.text.match(/, define\s+["“”]([^"“”]+)["“”]\s+["“”]([^"“”]+)["“”]/i),
    handle: async (event, m) => {
      const name = m[1].trim();
      const description = m[2].trim();
      await people.set(name, description);
      await web.chat.postMessage({
        text: `got it — ${name} is ${description}`,
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
      getDallEImage(event, `a portrait of ${description}`, name);
    },
  },
  {
    name: 'who-is',
    match: (event) => event.text.match(/, who is (.+?)\??$/i),
    handle: async (event, m) => {
      const name = m[1].trim();
      const description = people.get(name);
      await web.chat.postMessage({
        text: description
          ? `${name} is ${description}`
          : `i don't know who ${name} is`,
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
    },
  },
  {
    name: 'forget',
    match: (event) => event.text.match(/, forget (.+?)$/i),
    handle: async (event, m) => {
      const name = m[1].trim();
      const removed = await people.remove(name);
      await web.chat.postMessage({
        text: removed ? `forgot ${name}` : `i never knew ${name} anyway`,
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
    },
  },
  {
    name: 'pull-that-up',
    match: (event) =>
      event.text.toLowerCase().includes(', pull that up') ? true : null,
    handle: async (event) => {
      const lastMessage = await findLastTextMessage(event);
      if (!lastMessage) return;
      await addReactionOnce(event.channel, event.ts, 'eyes');
      performGoogleImageSearch(event, lastMessage.text!);
    },
  },
  {
    name: 'whats-this-or-that',
    match: (event) => event.text.match(/[Ww]hat[\'']?s (this|that)/),
    handle: async (event, m) => {
      const isThis = m[1].toLowerCase() === 'this';
      await addReactionOnce(event.channel, event.ts, 'eyes');
      // "what's this" -> image must be attached to this message.
      // "what's that" -> look at prior messages (thread-aware).
      const sourceMessage = isThis
        ? messageHasImage(event)
          ? event
          : null
        : await findLastImageMessage(event);
      if (sourceMessage) {
        const imageFile = sourceMessage.files!.find((f) =>
          (f.mimetype || '').startsWith('image/')
        );
        describeImage(event, imageFile);
        return;
      }
      const lastMessage = await findLastTextMessage(event);
      const url = extractImgUrl(
        lastMessage?.text || lastMessage?.message?.text
      );
      if (url) {
        describeImage(event, undefined, url);
      } else if (lastMessage?.text) {
        const query = removeStopwords(lastMessage.text.split(' ')).join(' ');
        await performGoogleImageSearch(event, query);
      }
    },
  },
  {
    name: 'preview-link',
    match: (event) =>
      event.text.toLowerCase().includes(', preview that link') ? true : null,
    handle: async (event) => {
      await addReactionOnce(event.channel, event.ts, 'mag_right');
      const sourceMessage = await findLastLinkMessage(event);
      const link = sourceMessage && messageLink(sourceMessage);
      if (!link) {
        await web.chat.postMessage({
          channel: event.channel,
          text: "i don't see a link to preview",
          thread_ts: event.thread_ts || event.ts,
        });
        return;
      }
      await sendPageScreenshot(event, link, 'preview');
    },
  },
  {
    name: 'look-up',
    match: (event) => event.text.match(/, look up (.*)/),
    handle: async (event, m) => {
      await addReactionOnce(event.channel, event.ts, 'mag_right');
      await performGoogleTextSearch(event, m[1]);
    },
  },
  {
    name: 'enhance',
    match: (event) => event.text.match(/[Ee]nhance/),
    handle: async (event) => {
      const sourceMessage = await findLastImageMessage(event);
      if (!sourceMessage) return;
      await addReactionOnce(event.channel, event.ts, 'eyes');
      getImageEdit(
        event,
        sourceMessage,
        'Crop and zoom into the center 40% of the image, filling the entire frame. The result should feel dramatically closer, like a 2.5x zoom.',
        'enhance'
      );
    },
  },
  {
    name: 'echo-subsection',
    match: (event) => {
      if (event.subtype === 'bot_message') return null;
      const last = (messageHistory[event.channel] || [])[1];
      if (!last) return null;
      if (last.subtype === 'bot_message') return null;
      if (!last.text) return null;
      if (!last.text.includes(event.text)) return null;
      return true;
    },
    handle: async (event) => {
      await web.chat.postMessage({
        text: event.text,
        channel: event.channel,
        as_user: false,
        thread_ts: event.thread_ts,
      });
    },
  },
  {
    name: 'at-work-on',
    match: (event) =>
      event.text === 'I am at work!' && event.user ? true : null,
    handle: async (event) => {
      await updateState({ [`at_work.${event.user}`]: true });
      const newCurrentWork = await getCurrentAtWork();
      const message =
        newCurrentWork > 1
          ? `Okay. there are now *${newCurrentWork} people* at work. Safesearch is on.`
          : 'Okay. You are the only person at work. SafeSearch is on.';
      web.chat.postMessage({
        text: message,
        channel: event.channel,
        as_user: false,
      });
    },
  },
  {
    name: 'who-at-work',
    match: (event) => (event.text === 'Who is at work?' ? true : null),
    handle: async (event) => {
      const userNamesAtWork = (await getUsersCurrentlyAtWork()).map(
        (u) => u.profile.display_name || u.profile.real_name || u.name
      );
      let msg: string;
      if (userNamesAtWork.length === 0) {
        msg = 'There is no one at work.';
      } else if (userNamesAtWork.length === 1) {
        msg = `*${makeNiceListFromArray(userNamesAtWork)}* is at work.`;
      } else {
        msg = `*${makeNiceListFromArray(userNamesAtWork)}* are at work.`;
      }
      web.chat.postMessage({
        text: msg,
        channel: event.channel,
        as_user: false,
        thread_ts: event.thread_ts,
      });
    },
  },
  {
    name: 'at-work-off',
    match: (event) =>
      event.text === 'I am no longer at work!' && event.user ? true : null,
    handle: async (event) => {
      await updateState({ [`at_work.${event.user}`]: false });
      const newCurrentWork = await getCurrentAtWork();
      let message: string;
      if (newCurrentWork > 1) {
        message = `Okay. There are still *${newCurrentWork} people* at work. SafeSearch is on.`;
      } else if (newCurrentWork === 1) {
        message = `Okay. There is still *${newCurrentWork} person* at work. SafeSearch is on.`;
      } else {
        message = `Okay. No one is currently at work. Turning SafeSearch off.`;
      }
      web.chat.postMessage({
        text: message,
        channel: event.channel,
        as_user: false,
        thread_ts: event.thread_ts,
      });
    },
  },
  {
    name: 'sanity-check',
    match: (event) => {
      if (event.subtype === 'bot_message') return null;
      const m = event.text.match(
        /,\s*sanity\s+check(?:\s+<#([^|>]+)(?:\|[^>]*)?>)?/i
      );
      return m ? { targetChannel: m[1] || null } : null;
    },
    handle: (event, ctx) => sanityCheck(event, ctx.targetChannel),
  },
  // Continuation in a thread Jeremy started — must come before `jeremy-chat`.
  {
    name: 'thread-continuation',
    match: async (event) => {
      if (!event.thread_ts) return null;
      if (event.subtype === 'bot_message') return null;
      const self = getSelf();

      // Fast path: parent is still in the in-memory buffer. Like the API
      // fallback below, accept bot user id directly — Jeremy's own messages
      // can arrive without the bot_message subtype.
      const localParent = (messageHistory[event.channel] || []).find(
        (msg) => msg.ts === event.thread_ts
      );
      if (localParent) {
        return isJeremyMessage(localParent, self) ||
          localParent.user === self?.id
          ? true
          : null;
      }

      // Buffer miss (parent evicted or restart) — ask Slack for the parent.
      // User token: bot token lacks the *:history scopes.
      try {
        const result = await userWeb.conversations.replies({
          channel: event.channel,
          ts: event.thread_ts,
          limit: 1,
        });
        const parent = (result.messages || [])[0] as SlackMessage | undefined;
        if (!parent) return null;
        // History API bot messages may carry bot_id without a bot_message
        // subtype, so check the bot user id directly too.
        return isJeremyMessage(parent, self) || parent.user === self?.id
          ? true
          : null;
      } catch (e: any) {
        console.log('thread-continuation parent fetch error', e.message);
        return null;
      }
    },
    handle: (event) => {
      getChatbot(event, event.text);
    },
  },
  // Catch-all chat trigger — must be the last command so specific
  // `, generate`/`, edit`/etc. patterns win even when prefixed with "jeremy".
  {
    name: 'jeremy-chat',
    match: (event) =>
      event.subtype !== 'bot_message'
        ? event.text.toLowerCase().match(/jeremy, (.*)/s)
        : null,
    handle: (event, m) => {
      getChatbot(event, m[1]);
    },
  },
];

export const runCommand = async (
  event: SlackMessageEvent
): Promise<Command | null> => {
  for (const cmd of COMMANDS) {
    const m = await cmd.match(event);
    if (m) {
      await cmd.handle(event, m);
      return cmd;
    }
  }
  return null;
};

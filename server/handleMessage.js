const stopword = require('stopword');
const { getSelf } = require('./self');
const messageHistory = require('./messageHistory');
const { markDirty } = require('./messageHistoryPersistence');
const { delay, getCurrentAtWork } = require('./util');
const { web } = require('./slackClient');
const { getEmojiList } = require('./emojiList');
const { addReactionOnce } = require('./reactionUtils');
const { updateState } = require('./db');
const { at, getSecondsToSlackTimestamp } = require('./timer');
const { runCommand } = require('./commands');

let lastEvent;

at('18:30', async () => {
  const atWork = await getCurrentAtWork();
  if (atWork > 0) {
    await updateState({ at_work: {} });
    if (lastEvent)
      web.chat.postMessage({
        text: 'It is now 6:30 PM, turning off SafeSearch',
        channel: lastEvent.channel,
      });
  }
});

at('16:20', async () => {
  if (lastEvent) {
    if (getSecondsToSlackTimestamp(lastEvent.ts) < 60 * 5) {
      web.chat.postMessage({
        text: 'Haha four twenty blaze it',
        channel: lastEvent.channel,
      });
    }
  }
});

const MAX_TRACKED_CHANNELS = 100;
const MAX_MESSAGES_PER_CHANNEL = 10;

const trackMessage = (event) => {
  if (!messageHistory[event.channel]) {
    const channels = Object.keys(messageHistory);
    if (channels.length >= MAX_TRACKED_CHANNELS) {
      delete messageHistory[channels[0]];
    }
    messageHistory[event.channel] = [];
  }
  if (messageHistory[event.channel].length >= MAX_MESSAGES_PER_CHANNEL) {
    messageHistory[event.channel].pop();
  }
  messageHistory[event.channel].unshift(event);
  markDirty(event.channel);
};

const pickRandom = (options) =>
  options[Math.floor(Math.random() * options.length)];

// Ambient behaviors run regardless of which command (if any) matched.
// Only commands marked `skipsAmbient` short-circuit them.
const runAmbient = async (event) => {
  const self = getSelf();
  const channelHistory = messageHistory[event.channel] || [];

  // Wave when addressed
  if (event.text.match(/[j|J]eremy/) || event.text.includes(self.id)) {
    await addReactionOnce(event.channel, event.ts, 'wave');
  }

  // Greeting reply
  if (event.text.match(/[H|h][i|ello] [j|J]eremy/)) {
    await delay(1000);
    await web.chat.postMessage({
      text: pickRandom(['Hey!', 'Hello.', "What's up dude?"]),
      channel: event.channel,
      as_user: false,
      thread_ts: event.thread_ts,
    });
  }

  // Thanks/nice reply if the previous message was Jeremy's
  const prev = channelHistory[1];
  if (
    (event.text.match(/[t|T]hanks/) || event.text.match(/[n|N]ice/)) &&
    !event.text.match(/[n|N]o/) &&
    prev &&
    (prev.username === self.name || prev.user === self.id)
  ) {
    await delay(1000);
    await web.chat.postMessage({
      text: pickRandom([
        'no worries',
        'any time',
        "you're welcome!",
        'sure thing my dude',
        'yeah!',
      ]),
      channel: event.channel,
      as_user: false,
      thread_ts: event.thread_ts,
    });
  }

  // Easter eggs
  if (event.text === 'respond_jerm' || event.text === 'jeremy me boy') {
    await delay(1000);
    await web.chat.postMessage({
      text: pickRandom(['hey', 'hello', 'hi there!', 'hey daddy']),
      channel: event.channel,
      as_user: false,
      thread_ts: event.thread_ts,
    });
  }

  // Emoji reactions on keyword matches
  const emojiList = getEmojiList();
  const wordsWithoutStopwords = stopword.removeStopwords(
    event.text.toLowerCase().split(' ')
  );
  await delay(1000);
  for (const word of wordsWithoutStopwords) {
    if (emojiList.includes(word)) {
      await delay(300);
      await addReactionOnce(event.channel, event.ts, word);
    }
  }
};

module.exports = async (event) => {
  trackMessage(event);
  lastEvent = event;

  try {
    if (!event.text) return;
    const matched = await runCommand(event);
    if (matched?.skipsAmbient) return;
    await runAmbient(event);
  } catch (error) {
    console.log('An error occurred', error);
    web.chat.postMessage({
      text: `error!, ${error.message}`,
      channel: event.channel,
      as_user: false,
    });
  }
};

const stopword = require('stopword');
const { getSelf } = require('./self');
const messageHistory = require('./messageHistory');
const sendImagesScreenshot = require('./sendImagesScreenshot');
const {
  delay,
  getCurrentAtWork,
  getUsersCurrentlyAtWork,
  makeNiceListFromArray,
  getBufferFromRequest,
} = require('./util');
const { web, rtm } = require('./slackClient');
const { getEmojiList } = require('./emojiList');
const cowsay = require('cowsay');
const sendSearchScreenshot = require('./sendSearchScreenshot');
const { updateState, getState, getStateValue } = require('./db');
const { at, getSecondsToSlackTimestamp } = require('./timer');
const getTikTok = require('./getTikTok');
const sendPageScreenshot = require('./sendPageScreenshot');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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
    const time = lastEvent.ts;
    if (getSecondsToSlackTimestamp(time) < 60 * 5) {
      web.chat.postMessage({
        text: 'Haha four twenty blaze it',
        channel: lastEvent.channel,
      });
    }
  }
});

module.exports = async (event) => {
  const self = getSelf();

  if (!messageHistory[event.channel]) {
    messageHistory[event.channel] = [];
  }
  if (messageHistory[event.channel].length > 5) {
    messageHistory[event.channel].pop();
  }

  lastEvent = event;

  // Add message to queue
  messageHistory[event.channel].unshift(event);

  console.log('messageHistory: ', messageHistory);

  try {
    /*
     * thick -> thicc
     * if (event.text.match(/ick\b/g)) {
     *   await web.chat.postMessage({
     *     text: event.text.replace(/ick\b/g, 'icc'),
     *     channel: event.channel,
     *     thread_ts: event.ts
     *   })
     * }
     * Look something up
     */
    if (!event.text) return;
    if (event.text.match(/[W|w]hat means (.*)/)) {
      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      const query = event.text.match(/[W|w]hat means (.*)/)[1];
      await sendImagesScreenshot(event, query);
    } else if (event.text.match(/, pull up (.*) or (.*)/)) {
      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'game_die',
      });
      const match = Math.random() > 0.5 ? 1 : 2;
      const query = event.text.match(/, pull up (.*) or (.*)/);
      const firstImageOnly = true;
      await sendImagesScreenshot(event, query[match], firstImageOnly);
    } else if (event.text.match(/, pull up (.*)/)) {
      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      const query = event.text.match(/, pull up (.*)/)[1];
      const firstImageOnly = true;
      await sendImagesScreenshot(event, query, firstImageOnly);
    } else if (event.text.match(/, generate (.*)/)) {
      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'artist',
      });
      const query = event.text.match(/, generate (.*)/)[1];
      let response;
      try {
        response = await openai.createImage({
          prompt: query,
          n: 1,
          size: '512x512',
        });
      } catch (e) {
        await web.chat.postMessage({
          text: 'error sry',
          channel: event.channel,
        });
      }
      image_url = response.data.data[0].url;
      const data = await getBufferFromRequest(image_url);
      await web.files.upload({
        channels: event.channel,
        file: data,
        filetype: 'auto',
        text: query,
        filename: query,
      });
    } else if (event.text.toLowerCase().includes(', pull that up')) {
      // Look up the previous message
      const lastMessage = messageHistory[event.channel][1];
      if (!lastMessage) return;

      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      const query = lastMessage.text;
      const firstImageOnly = true;
      await sendImagesScreenshot(event, query, firstImageOnly);
    } else if (
      event.text.match(/[W|w]hat[\'|\’]?s that/) &&
      event.text.match(/[W|w]hat[\'|\’]?s that/).length
    ) {
      // Look up the previous message
      const lastMessage = messageHistory[event.channel][1];
      if (!lastMessage) return;

      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
        thread_ts: event.ts,
      });
      const query = stopword
        .removeStopwords(lastMessage.text.split(' '))
        .join(' ');
      await sendImagesScreenshot(event, query);
    } else if (event.text.toLowerCase().includes(', preview that link')) {
      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'mag_right',
      });

      // Look up the previous message
      const lastMessage = messageHistory[event.channel][1];
      if (!lastMessage) return;

      // https://regex101.com/library/y09jwv
      const link = lastMessage.text.match(
        /<(https?:\/\/[\w-]+(?:\.[\w]+)+(?:\/[\w-?=%&@$#_.+]+)*\/?)(?:\|((?:[^>])+))?>/
      )[1];
      sendPageScreenshot(lastMessage, link, 'preview');
    } else if (event.text.match(/, look up (.*)/)) {
      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'mag_right',
      });
      const query = event.text.match(/, look up (.*)/)[1];
      await sendSearchScreenshot(event, query);
    } else if (event.text.match(/[E|e]nhance/)) {
      // React to the message
      const lastFile = messageHistory[event.channel].find(
        (message) => message.files
      );
      if (!lastFile) return;
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      const query = lastFile.files.pop().name;
      const firstImageOnly = true;
      await sendImagesScreenshot(event, query, firstImageOnly);
    } else if (
      // last message exists
      messageHistory[event.channel][1] &&
      // double check last and this message are not from jeremy
      messageHistory[event.channel][1].subtype !== 'bot_message' &&
      event.subtype !== 'bot_message' &&
      // this message is a subsection of the last message
      messageHistory[event.channel][1].text &&
      messageHistory[event.channel][1].text.includes(event.text)
    ) {
      await web.chat.postMessage({
        text: event.text,
        channel: event.channel,
        as_user: false,
        // username: // getSelf().id ??
      });
    } else if (event.text.match(/, cowsay (.*)/)) {
      const query = event.text.match(/, cowsay (.*)/)[1];
      await web.chat.postMessage({
        /* eslint-disable-next-line no-useless-concat */
        text: '```' + '\n' + cowsay.say({ text: query }) + '\n' + '```',
        channel: event.channel,
        as_user: true,
        username: 'cow',
      });
    }

    // Self awareness
    if (event.text.match(/[j|J]eremy/) || event.text.includes(self.id)) {
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'wave',
      });
    }

    // Reply to a greeting
    if (event.text.match(/[H|h][i|ello] [j|J]eremy/)) {
      let options = ['Hey!', 'Hello.', "What's up dude?"];
      let text = options[Math.floor(Math.random() * options.length)];
      await delay(1000);
      await web.chat.postMessage({
        text: text,
        channel: event.channel,
        as_user: false,
      });
    }

    // Respond to "thanks" if someone says it to Jeremy
    if (
      (event.text.match(/[t|T]hanks/) || event.text.match(/[n|N]ice/)) &&
      !event.text.match(/[n|N]o/) &&
      messageHistory[event.channel][1] &&
      (messageHistory[event.channel][1].username === self.name ||
        messageHistory[event.channel][1].user === self.id)
    ) {
      let options = [
        'no worries',
        'any time',
        "you're welcome!",
        'sure thing my dude',
        'yeah!',
      ];
      let text = options[Math.floor(Math.random() * options.length)];
      await delay(1000);
      await web.chat.postMessage({
        text: text,
        channel: event.channel,
        as_user: false,
        // username: // how can we determine jeremy's username, rather than his bot name?
      });
    }

    if (event.text === 'respond_jerm' || event.text === 'jeremy me boy') {
      let options = ['hey', 'hello', 'hi there!', 'hey daddy'];
      let text = options[Math.floor(Math.random() * options.length)];
      await delay(1000);
      await web.chat.postMessage({
        text: text,
        channel: event.channel,
        as_user: false,
        // username: getSelf().id doesn't work? or does it?
      });
    }

    // React to a message if it contains a word matching an emoji
    const emojiList = getEmojiList();
    const wordsWithoutStopwords = stopword.removeStopwords(
      event.text.toLowerCase().split(' ')
    );

    await delay(1000);
    for (let word of wordsWithoutStopwords) {
      if (emojiList.includes(word)) {
        await delay(300);
        await web.reactions.add({
          channel: event.channel,
          timestamp: event.ts,
          name: word,
        });
      }
    }

    if (event.text === 'I am at work!') {
      if (!event.user) return;
      await updateState({ [`at_work.${event.user}`]: true });
      const newCurrentWork = await getCurrentAtWork();
      let message =
        newCurrentWork > 1
          ? `Okay. there are now *${newCurrentWork} people* at work. Safesearch is on.`
          : 'Okay. You are the only person at work. SafeSearch is on.';
      web.chat.postMessage({
        text: message,
        channel: event.channel,
        as_user: false,
      });
    }

    if (event.text === 'Who is at work?') {
      const userNamesAtWork = (await getUsersCurrentlyAtWork()).map(
        (user) => user.profile.display_name
      );

      let msg;
      if (userNamesAtWork.length === 0) {
        msg = 'There is no one at work.';
      } else if (userNamesAtWork.length === 1) {
        msg = `*${makeNiceListFromArray(userNamesAtWork)}* is at work.`;
      } else if (userNamesAtWork.length > 1) {
        msg = `*${makeNiceListFromArray(userNamesAtWork)}* are at work.`;
      }

      web.chat.postMessage({
        text: msg,
        channel: event.channel,
        as_user: false,
      });
    }

    if (event.text === 'I am no longer at work!') {
      if (!event.user) return;
      await updateState({ [`at_work.${event.user}`]: false });
      const newCurrentWork = await getCurrentAtWork();
      let message;
      if (newCurrentWork > 1) {
        message = `Okay. There are still *${newCurrentWork} people* at work. SafeSearch is on.`;
      } else if (newCurrentWork === 1) {
        message = `Okay. There is still *${newCurrentWork} person* at work. SafeSearch is on.`;
      } else if (newCurrentWork === 0) {
        message = `Okay. No one is currently at work. Turning SafeSearch off.`;
      }
      web.chat.postMessage({
        text: message,
        channel: event.channel,
        as_user: false,
      });
    }

    if (event.text.startsWith('<https://www.tiktok.com/')) {
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      getTikTok(event);
    }

    // Funny ussy
    const syllables = (_word) => {
      let word = _word.toLowerCase();
      const ret = word
        .replace(/(?:[^laeiouy]es|ed|lle|[^laeiouy]e)$/, '')
        .replace(/^y/, '')
        .match(/[aeiouy]{1,2}/g);
      return ret || [];
    };

    const getNewWord = (wordList) => {
      const newWords = wordList
        // test that it only contains letters
        .filter((word) => /^[a-zA-Z]+$/.test(word))
        // test that it's more than one syllable
        .filter((word) => syllables(word).length > 1);

      if (!newWords.length) return undefined;
      const randomWord = newWords[Math.floor(Math.random() * newWords.length)];

      const parts = syllables(randomWord);

      const partsStart = randomWord.lastIndexOf(parts[parts.length - 1]);
      return randomWord.slice(0, partsStart) + 'ussy';
    };

    const newWord = getNewWord(wordsWithoutStopwords);

    // give it a low percentage of happening
    const probability = 0.003;

    const names = ['jon', 'gio', 'rajan', 'nick', 'cleb', 'brian'];
    const name = names[Math.floor(Math.random() * names.length)];
    const templates = [
      (word) => `i heard ${name} loves a tight ${word}`,
      (word) => `i would love to suck ${name}s ${word}`,
      (word) => `${name} can eat my ${word} any day`,
      (word) => `wow, ${name} can sure work a ${word}`,
      (word) => `${name} and ${word} are a match made in heaven`,
    ];

    if (Math.random() < probability && newWord !== undefined) {
      await web.chat.postMessage({
        text: templates[Math.floor(Math.random() * templates.length)](newWord),
        channel: event.channel,
      });
      await sendImagesScreenshot(event, newWord, true);
    }
  } catch (error) {
    console.log('An error occurred', error);
  }
};

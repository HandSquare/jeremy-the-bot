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
  getUsers,
  extractImgUrl,
} = require('./util');
const { web, rtm } = require('./slackClient');
const { getEmojiList } = require('./emojiList');
const cowsay = require('cowsay');
const { updateState, getState, getStateValue } = require('./db');
const { at, getSecondsToSlackTimestamp } = require('./timer');
const getTikTok = require('./getTikTok');
const sendPageScreenshot = require('./sendPageScreenshot');

const getDallEImage = require('./getDallEImage');
const getChatbot = require('./getChatbot');
const {
  performGoogleImageSearch,
  performGoogleTextSearch,
} = require('./performGoogleSearch');
const describeImage = require('./describeImage');
const shouldRespond = require('./shouldRespond');

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
  if (messageHistory[event.channel].length > 10) {
    messageHistory[event.channel].pop();
  }

  lastEvent = event;

  // Add message to queue
  messageHistory[event.channel].unshift(event);

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
      performGoogleImageSearch(event, query[match]);
    } else if (event.text.match(/, pull up (.*)/)) {
      // React to the message
      await web.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'eyes',
      });
      const query = event.text.match(/, pull up (.*)/)[1];
      performGoogleImageSearch(event, query);
    } else if (event.text.toLowerCase().includes(', generate that')) {
      // Look up the previous message
      const lastMessage = messageHistory[event.channel][1];
      if (!lastMessage) return;
      getDallEImage(lastMessage, lastMessage.text);
    } else if (event.text.match(/, generate (.*)/)) {
      const query = event.text.match(/, generate (.*)/)[1];
      getDallEImage(event, query);
    } else if (
      event.text.toLowerCase().match(/jeremy, (.*)/) &&
      event.subtype !== 'bot_message'
    ) {
      const query = event.text.toLowerCase().match(/jeremy, (.*)/s)[1];
      getChatbot(event, query);
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
      performGoogleImageSearch(event, query);
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

      const file = lastMessage.files ? lastMessage.files[0] : null;
      const url = extractImgUrl(lastMessage?.text || lastMessage.message?.text);
      if (file) {
        describeImage(event, file);
      } else if (url) {
        describeImage(event, undefined, url);
      } else {
        const query = stopword
          .removeStopwords(lastMessage.text.split(' '))
          .join(' ');

        await sendImagesScreenshot(event, query);
      }
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
      await performGoogleTextSearch(event, query);
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
      performGoogleImageSearch(event, query);
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
        thread_ts: event.thread_ts,
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
        thread_ts: event.thread_ts,
      });
    } else {
      // Conservative AI-based router fallback: only when no explicit command matched
      if (event.subtype !== 'bot_message') {
        const decision = await shouldRespond(event);
        if (decision.respond && decision.confidence >= 0.8) {
          const query = event.text.replace(/^jeremy,?\s*/i, '');
          getChatbot(event, query);
        }
      }
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
        thread_ts: event.thread_ts,
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
        thread_ts: event.thread_ts,
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
        thread_ts: event.thread_ts,
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
        thread_ts: event.thread_ts,
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
        thread_ts: event.thread_ts,
      });
    }

    if (event.text === 'What are the boys talking about?') {
      // const history = messageHistory[event.channel].map((event) => event.text);
      const users = await getUsers();
      const userHash = users.reduce((prev, curr) => {
        prev[curr.id] = curr.name;
        return prev;
      }, {});

      console.log({ userHash });
      const history = await web.conversations.history({
        channel: event.channel,
        limit: 25,
      });
      const messages = history.messages
        .reverse()
        .map((msg) => {
          let user = userHash[msg.user];
          if (user === undefined && msg.username === 'Jeremy') user = 'Jeremy';
          return `${user}: ${msg.text}`;
        })
        .join('\n');
      // console.log({history: history.messages})
      console.log(messages);
      getChatbot(
        event,
        `Jeremy, given the following chat history, tell me what the boys are talking about.
        ${messages}
        `
      );
    }

    // This stopped working
    // if (event.text.startsWith('<https://www.tiktok.com/')) {
    //   await web.reactions.add({
    //     channel: event.channel,
    //     timestamp: event.ts,
    //     name: 'eyes',
    //   });
    //   getTikTok(event);
    // }
  } catch (error) {
    console.log('An error occurred', error);
    web.chat.postMessage({
      text: `error!, ${error.message}`,
      channel: event.channel,
      as_user: false,
    });
  }
};

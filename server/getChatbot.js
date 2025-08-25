const OpenAI = require('openai');
const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

const { web } = require('./slackClient');
const { getBufferFromRequest, getUsers } = require('./util');
const { getSelf } = require('./self');
const messageHistory = require('./messageHistory');

module.exports = async (event, query) => {
  console.log({ event });
  await web.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'thinking_face',
  });
  let response;
  try {
    // Get user mappings for better context
    const users = await getUsers();
    const userHash = users.reduce((prev, curr) => {
      prev[curr.id] = curr.name;
      return prev;
    }, {});

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
          (m.user === self.id ||
            m.username?.toLowerCase() === self.name.toLowerCase());
        const author = isJeremy
          ? 'Jeremy'
          : userHash[m.user] || m.username || m.user || 'user';
        return `${author}: ${m.text}`;
      })
      .join('\n');

    const isContinuation =
      Boolean(event.thread_ts) ||
      channelHistory.some(
        (m) =>
          m &&
          m.subtype === 'bot_message' &&
          (m.user === self.id ||
            m.username?.toLowerCase() === self.name.toLowerCase())
      );

    const currentUserName =
      userHash[event.user] || event.username || event.user || 'user';
    const prompt = `Here is recent conversation history from this Slack channel (most recent last):\n${formattedHistory}\n\n${currentUserName}: ${query}\nJeremy:`;

    response = await openai.responses.create({
      model: 'gpt-5-mini',
      instructions:
        'You are Jeremy. You are a helpful assistant. You are just a regular guy and often respond with stupid puns.' +
        (isContinuation
          ? ' This is a continuation of an ongoing conversation. Do not greet, do not reintroduce yourself, and do not restate your name. '
          : ' If appropriate, you may briefly remind people that your name is Jeremy.'),
      input: prompt,
    });
    console.log(response);

    await web.chat.postMessage({
      text: response.output_text,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  } catch (e) {
    console.log('err', e);
    await web.chat.postMessage({
      text: `error sry: ${e.message}`,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  }
};

const OpenAI = require('openai');
const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

const { web } = require('./slackClient');
const { getBufferFromRequest } = require('./util');
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
    // Build channel-specific history context
    const channelHistory = (messageHistory[event.channel] || [])
      .filter((m) => !!m && typeof m.text === 'string')
      .slice(0, 10)
      .reverse();

    const formattedHistory = channelHistory
      .map((m) => {
        const isBot = m.subtype === 'bot_message';
        const author = isBot ? 'Jeremy' : m.username || m.user || 'user';
        return `${author}: ${m.text}`;
      })
      .join('\n');

    const prompt = `Here is recent conversation history from this Slack channel (most recent last):\n${formattedHistory}\n\nUser: ${query}\nJeremy:`;

    response = await openai.responses.create({
      model: 'gpt-5',
      instructions:
        'You are Jeremy. You are a helpful assistant. You like reminding people your name is Jeremy and you are just a regular guy. You often respond with stupid puns.',
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

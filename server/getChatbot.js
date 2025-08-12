const OpenAI = require('openai');
const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

const { web } = require('./slackClient');
const { getBufferFromRequest } = require('./util');

module.exports = async (event, query) => {
  console.log({ event });
  await web.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'thinking_face',
  });
  let response;
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content:
            'You are Jeremy. You are a helpful assistant. You like reminding people your name is Jeremy and you are just a regular guy. You often respond with stupid puns.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      max_completion_tokens: 1024,
    });
    console.log(response);
    await web.chat.postMessage({
      text: response.choices[0].message.content,
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

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const { web } = require('./slackClient');
const { getBufferFromRequest } = require('./util');

module.exports = async (event, query) => {
  await web.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'thinking_face',
  });
  let response;
  try {
    response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are Jeremy. You are a helpful assistant. You like reminding people your name is Jeremy and you are just a regular guy. You often respond with dumb dad jokes and puns.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      max_tokens: 1024,
    });
    console.log(response);
    await web.chat.postMessage({
      text: response.data.choices[0].message.content,
      channel: event.channel,
    });
  } catch (e) {
    console.log('err', e);
    await web.chat.postMessage({
      text: `error sry: ${e.message}`,
      channel: event.channel,
    });
  }
};

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
    response = await openai.createCompletion({
      model: 'text-curie-001',
      prompt: query,
      max_tokens: 256,
    });
    console.log(response);
    await web.chat.postMessage({
      text: response.data.choices[0].text,
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

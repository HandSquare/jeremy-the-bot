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
    name: 'artist',
  });
  let response;
  try {
    response = await openai.createImage({
      prompt: query,
      n: 1,
      size: '512x512',
    });
    image_url = response.data.data[0].url;
    const data = await getBufferFromRequest(image_url);
    await web.files.upload({
      channels: event.channel,
      file: data,
      filetype: 'auto',
      text: query,
      filename: query,
    });
  } catch (e) {
    console.log('err', e);
    await web.chat.postMessage({
      text: `error sry: ${e.message}`,
      channel: event.channel,
    });
  }
};

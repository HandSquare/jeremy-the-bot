const OpenAI = require('openai');
const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

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
    response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: query,
      n: 1,
      size: '1024x1024',
    });

    const image_url = response.data[0].url;

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
      thread_ts: event.thread_ts,
    });
  }
};

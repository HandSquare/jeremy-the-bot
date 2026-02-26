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
      model: 'gpt-image-1.5',
      prompt: query,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    });

    // The API now returns base64 data instead of URL
    const base64Data = response.data[0].b64_json;

    // Convert base64 to Buffer for Slack upload
    const data = Buffer.from(base64Data, 'base64');

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

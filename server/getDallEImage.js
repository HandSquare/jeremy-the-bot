const OpenAI = require('openai');
const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

const { web } = require('./slackClient');
const { getBufferFromRequest } = require('./util');
const generateSlug = require('./generateSlug');

module.exports = async (event, query) => {
  await web.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'artist',
  });
  try {
    const [response, slug] = await Promise.all([
      openai.images.generate({
        model: 'gpt-image-2',
        prompt: query,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      }),
      generateSlug(query),
    ]);

    const base64Data = response.data[0].b64_json;
    const data = Buffer.from(base64Data, 'base64');

    const result = await web.filesUploadV2({
      channel_id: event.channel,
      file: data,
      filename: `${slug}.png`,
    });
    console.log('File uploaded:', result.files);
  } catch (e) {
    console.log('err', e);
    await web.chat.postMessage({
      text: `error sry: ${e.message}`,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  }
};

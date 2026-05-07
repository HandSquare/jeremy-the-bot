const axios = require('axios');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { web } = require('./slackClient');
const generateSlug = require('./generateSlug');

const downloadSlackFile = async (file) => {
  const link = file.url_private_download || file.url_private;
  const resp = await axios.get(link, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  return Buffer.from(resp.data);
};

module.exports = async (event, sourceMessage, prompt, slugInput = prompt) => {
  await web.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'lower_left_paintbrush',
  });

  try {
    const files = (sourceMessage.files || []).filter((f) =>
      (f.mimetype || '').startsWith('image/')
    );
    if (files.length === 0) {
      await web.chat.postMessage({
        text: "i don't see an image to edit",
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
      return;
    }

    const images = await Promise.all(
      files.map(async (f) => {
        const buf = await downloadSlackFile(f);
        const ext = (f.filetype || 'png').toLowerCase();
        const filename = `${f.id || 'image'}.${ext}`;
        return OpenAI.toFile(buf, filename, { type: f.mimetype });
      })
    );

    const [response, slug] = await Promise.all([
      openai.images.edit({
        model: 'gpt-image-2',
        image: images.length === 1 ? images[0] : images,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      }),
      generateSlug(slugInput),
    ]);

    const base64Data = response.data[0].b64_json;
    const data = Buffer.from(base64Data, 'base64');

    const result = await web.filesUploadV2({
      channel_id: event.channel,
      file: data,
      filename: `${slug}.png`,
    });
    console.log('Edited image uploaded:', result.files);
  } catch (e) {
    console.log('err', e);
    await web.chat.postMessage({
      text: `error sry: ${e.message}`,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  }
};

const axios = require('axios');
const OpenAI = require('openai');
const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};
const { web } = require('./slackClient');

const openai = new OpenAI(configuration);

module.exports = async (event, file, imgUrl) => {
  console.log({ file });
  let url;

  if (imgUrl) url = imgUrl;
  else if (file) {
    const link = file.url_private_download || file.url_private;
    const resp = await axios.get(link, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
    });
    const data = resp.data;
    const base64 = Buffer.from(data).toString('base64');
    url = `data:image/jpeg;base64,${base64}`;
  }

  await web.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'thinking_face',
  });
  let response;
  try {
    response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      instructions:
        'You are Jeremy. You are a helpful assistant. You like reminding people your name is Jeremy and you are just a regular guy. You often respond with stupid puns.',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: "What's in this image? Please sum it up in just a few sentences.",
            },
            {
              type: 'input_image',
              image_url: url,
            },
          ],
        },
      ],
      max_output_tokens: 1024,
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

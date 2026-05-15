import axios from 'axios';
import OpenAI from 'openai';
import { web } from './slackClient';
import { SlackMessageEvent, SlackFile } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const describeImage = async (
  event: SlackMessageEvent,
  file?: SlackFile,
  imgUrl?: string
): Promise<void> => {
  console.log({ file });
  let url: string | undefined;

  if (imgUrl) url = imgUrl;
  else if (file) {
    const link = file.url_private_download || file.url_private;
    const resp = await axios.get(link!, {
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
  try {
    const response = await openai.responses.create({
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
              image_url: url!,
              detail: 'auto',
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
  } catch (e: any) {
    console.log('err', e);
    await web.chat.postMessage({
      text: `error sry: ${e.message}`,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  }
};

export default describeImage;

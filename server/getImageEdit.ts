import axios from 'axios';
import OpenAI from 'openai';
import { web } from './slackClient';
import generateSlug from './generateSlug';
import { SlackMessageEvent, SlackFile, SlackMessage } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const downloadSlackFile = async (file: SlackFile): Promise<Buffer> => {
  const link = file.url_private_download || file.url_private;
  const resp = await axios.get(link!, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  return Buffer.from(resp.data);
};

const getImageEdit = async (
  event: SlackMessageEvent,
  sourceMessage: SlackMessageEvent | SlackMessage,
  prompt: string,
  slugInput: string = prompt
): Promise<void> => {
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
        image: images.length === 1 ? images[0] : (images as any),
        prompt: prompt.includes('[')
          ? `${prompt}\n\nText in [brackets] describes a person's appearance. Do not render it as visible text or labels.`
          : prompt,
        n: 1,
        size: 'auto',
        quality: 'medium',
      }),
      generateSlug(slugInput),
    ]);

    const base64Data = response.data![0].b64_json!;
    const data = Buffer.from(base64Data, 'base64');

    await web.filesUploadV2({
      channel_id: event.channel,
      file: data,
      filename: `${slug}.png`,
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

export default getImageEdit;

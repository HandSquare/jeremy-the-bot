import axios from 'axios';
import OpenAI from 'openai';
import { web } from './slackClient';
import generateSlug from './generateSlug';
import { SlackMessageEvent, SlackFile, SlackMessage } from './types';
import { getMessageImageSources, MessageImageSource } from './imageSources';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const downloadSlackFile = async (file: SlackFile): Promise<Buffer> => {
  const link = file.url_private_download || file.url_private;
  const resp = await axios.get(link!, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  return Buffer.from(resp.data);
};

const downloadImage = async (
  source: MessageImageSource,
  index: number
): Promise<ReturnType<typeof OpenAI.toFile>> => {
  if (source.kind === 'slack-file') {
    const file = source.file;
    const buf = await downloadSlackFile(file);
    const ext = (file.filetype || 'png').toLowerCase();
    const filename = `${file.id || `image-${index}`}.${ext}`;
    return OpenAI.toFile(buf, filename, { type: file.mimetype });
  }

  const response = await axios.get(source.url, {
    responseType: 'arraybuffer',
    timeout: 15_000,
  });
  const contentType = String(response.headers['content-type'] || '')
    .split(';')[0]
    .trim();
  if (!contentType.startsWith('image/')) {
    throw new Error('the previous link did not return an image');
  }
  const ext = contentType.split('/')[1] || 'png';
  return OpenAI.toFile(Buffer.from(response.data), `image-${index}.${ext}`, {
    type: contentType,
  });
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
    const sources = getMessageImageSources(sourceMessage);
    if (sources.length === 0) {
      await web.chat.postMessage({
        text: "i don't see an image to edit",
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
      return;
    }

    const images = await Promise.all(
      sources.map((source, index) => downloadImage(source, index))
    );

    const [response, slug] = await Promise.all([
      openai.images.edit({
        model: 'gpt-image-2',
        image: images.length === 1 ? images[0] : (images as any),
        prompt: prompt,
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

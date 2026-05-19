import { web } from './slackClient';
import { SlackMessageEvent } from './types';

const THUM_BASE = 'https://image.thum.io/get/width/1280/wait/5000';
const LOADER_SIZE_THRESHOLD = 50_000;
const RETRY_DELAY_MS = 8_000;

const fetchScreenshot = async (url: string): Promise<Buffer> => {
  const res = await fetch(`${THUM_BASE}/${url}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`thum.io returned ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const sendPageScreenshot = async (
  event: SlackMessageEvent,
  url: string,
  caption: string
): Promise<void> => {
  try {
    let data = await fetchScreenshot(url);
    if (data.length < LOADER_SIZE_THRESHOLD) {
      await sleep(RETRY_DELAY_MS);
      data = await fetchScreenshot(url);
    }

    const threadTs = event.thread_ts || event.ts;
    const result = await web.filesUploadV2({
      channel_id: event.channel,
      file: data,
      filename: `${caption}.png`,
      initial_comment: caption,
      thread_ts: threadTs,
    } as any);

    const fileMsg = (result as any).files?.[0]?.shares?.public?.[
      event.channel
    ]?.[0];
    if (fileMsg?.ts) {
      await web.chat
        .update({
          channel: event.channel,
          ts: fileMsg.ts,
          reply_broadcast: true,
        } as any)
        .catch(() => {});
    }
  } catch (e: any) {
    console.error('sendPageScreenshot error:', e.message);
    await web.chat.postMessage({
      channel: event.channel,
      text: `couldn't screenshot that page: ${e.message}`,
      thread_ts: event.thread_ts || event.ts,
    });
  }
};

export default sendPageScreenshot;

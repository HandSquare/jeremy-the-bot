const { web } = require('./slackClient');

const THUM_BASE = 'https://image.thum.io/get/width/1280/wait/5000';
const LOADER_SIZE_THRESHOLD = 50_000;
const RETRY_DELAY_MS = 8_000;

const fetchScreenshot = async (url) => {
  const res = await fetch(`${THUM_BASE}/${url}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`thum.io returned ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sendPageScreenshot = async (event, url, caption) => {
  try {
    let data = await fetchScreenshot(url);
    if (data.length < LOADER_SIZE_THRESHOLD) {
      await sleep(RETRY_DELAY_MS);
      data = await fetchScreenshot(url);
    }

    await web.filesUploadV2({
      channel_id: event.channel,
      file: data,
      filename: `${caption}.png`,
      initial_comment: caption,
    });
  } catch (e) {
    console.error('sendPageScreenshot error:', e.message);
    await web.chat.postMessage({
      channel: event.channel,
      text: `couldn't screenshot that page: ${e.message}`,
      thread_ts: event.thread_ts || event.ts,
    });
  }
};

module.exports = sendPageScreenshot;

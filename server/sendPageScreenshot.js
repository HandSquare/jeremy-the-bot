const { web } = require('./slackClient');

const THUM_BASE = 'https://image.thum.io/get/width/1280';

const sendPageScreenshot = async (event, url, caption) => {
  try {
    const screenshotUrl = `${THUM_BASE}/${url}`;
    const res = await fetch(screenshotUrl, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`thum.io returned ${res.status}`);
    const data = Buffer.from(await res.arrayBuffer());

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

const launchBrowser = require('./launchBrowser');
const { web } = require('./slackClient');

const sendPageScreenshot = async (event, url, caption) => {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({
      width: 1280,
      height: 1024,
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });

    const data = await page.screenshot();

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
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = sendPageScreenshot;

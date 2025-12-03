const puppeteer = require('puppeteer');
const { web } = require('./slackClient');

const sendPageScreenshot = async (event, url, caption) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setViewport({
    width: 1280,
    height: 1024,
  });

  await page.goto(url);

  let data = await page.screenshot();

  await browser.close();

  await web.filesUploadV2({
    channel_id: event.channel,
    file: data,
    filename: `${caption}.png`,
    initial_comment: caption,
  });
};

module.exports = sendPageScreenshot;

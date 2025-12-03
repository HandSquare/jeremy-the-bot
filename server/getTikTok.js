const puppeteer = require('puppeteer');
const { web } = require('./slackClient');
const { getBufferFromRequest } = require('./util');

const getTikTok = async (event) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(event.text.slice(1, event.text.length - 1));

  const { url, text, video } = await page.evaluate(() => {
    const elem = document.querySelector('div[style^="background"]');
    if (!elem) return '';
    const imgStyle = elem.style.backgroundImage;
    return {
      url: imgStyle.slice(5, imgStyle.length - 2),
      video: document.querySelector('video').src,
      text: document.querySelector('[data-e2e="browse-video-desc"]').innerText,
    };
  });

  browser.close();
  console.log({ video, url, text });

  if (!video) throw new Error('no video data');

  let data;
  try {
    data = await getBufferFromRequest(video);
  } catch (e) {
    console.error(e);
  }

  console.log('data', data);

  await web.filesUploadV2({
    channel_id: event.channel,
    file: data,
    filename: `${text}.mp4`,
  });
};

module.exports = getTikTok;

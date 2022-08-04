const puppeteer = require('puppeteer');
const { web } = require('./slackClient');
const { getBufferFromRequest } = require('./util');

const getTikTokThumb = async (event) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(event.text.slice(1, event.text.length - 1));

  const { url, text } = await page.evaluate(() => {
    const elem = document.querySelector('div[style^="background"]');
    if (!elem) return '';
    const imgStyle = elem.style.backgroundImage;
    return {
      url: imgStyle.slice(5, imgStyle.length - 2),
      text: document.querySelector('[data-e2e="browse-video-desc"]').innerText,
    };
  });

  browser.close();

  if (!url) return;

  let data;
  try {
    data = await getBufferFromRequest(url);
  } catch (e) {
    console.error(e);
  }

  web.files.upload({
    channels: event.channel,
    file: data,
    filetype: 'auto',
    filename: text,
  });
};

module.exports = getTikTokThumb;

const puppeteer = require('puppeteer');
const { web } = require('./slackClient');

const getTikTokThumb = async (event) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(event.text.slice(1, event.text.length - 1));

  const url = await page.evaluate(() => {
    const elem = document.querySelector('div[style^="background"]');
    if (!elem) return '';
    const imgStyle = elem.style.backgroundImage;
    return imgStyle.slice(5, imgStyle.length - 2);
  });

  browser.close();

  if (!url) return;

  await web.chat.postMessage({
    text: `<${url}|Here's a thumbnail of that TikTok>`,
    channel: event.channel,
    as_user: false,
  });
};

module.exports = getTikTokThumb;

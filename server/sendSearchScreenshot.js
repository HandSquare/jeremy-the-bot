const puppeteer = require('puppeteer');
const { web } = require('./slackClient');

const sendSearchScreenshot = async (event, query) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setViewport({
    width: 1280,
    height: 1024,
  });

  await page.goto(
    `https://www.google.com/search?q=${encodeURIComponent(query)}`
  );

  let data = await page.screenshot();

  await browser.close();
  console.log(data.slice(0, 1000));
  await web.files.upload({
    channels: event.channel,
    file: data,
    filetype: 'auto',
    text: query,
    filename: query,
  });
};

module.exports = sendSearchScreenshot;

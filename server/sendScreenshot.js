const puppeteer = require('puppeteer');
const { web } = require('./slackClient');

const https = require('https');
const http = require('http');
const { type } = require('os');

const getBufferFromRequest = (url) =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (resp) => {
        const dataArray = [];
        resp.on('data', (data) => {
          dataArray.push(data);
        });
        resp.on('end', () => {
          resolve(Buffer.concat(dataArray));
        });
      })
      .on('error', (e) => {
        reject(e.message);
      });
  });

const getCroppedScreenshot = async (page, firstImageUrl) => {
  await page.goto(firstImageUrl);
  const { width, height } = await page.evaluate(() => {
    const img = document.getElementsByTagName('img')[0];
    return {
      width: img.width,
      height: img.height,
    };
  });
  page.setViewport({
    width,
    height,
  });
  return page.screenshot();
};

const sendScreenshot = async (event, query, firstImageOnly) => {
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
    `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`
  );

  // either a page screenshot or an img
  let data;

  if (firstImageOnly) {
    // Click the first link to open the side panel
    await page.click('div.islrc > div > a');
    // Get image directly from url
    const firstImageUrl = await page.evaluate(() =>
      decodeURIComponent(
        document
          .getElementById('Sva75c') // the black sidebar
          .querySelector('img').src // the first img
      )
    );
    data = await getCroppedScreenshot(page, firstImageUrl);
  } else {
    data = await page.screenshot();
  }

  await browser.close();

  await web.files.upload({
    channels: event.channel,
    file: data,
    filetype: 'auto',
    text: query,
    filename: query,
  });
};

module.exports = sendScreenshot;

const puppeteer = require('puppeteer');
const { web } = require('./slackClient');

const https = require('https');
const http = require('http');
const { getStateValue } = require('./db');
const { delay, getCurrentAtWork } = require('./util');

const getScreenshotOfSingleImage = async (page, imageUrl) => {
  await page.goto(imageUrl);
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

const sendImagesScreenshot = async (event, query, firstImageOnly) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setViewport({
    width: 1280,
    height: 1024,
  });

  const IMAGE_SEARCH = `&tbm=isch`;
  const LARGE_IMAGES_ONLY = '&tbs=isz:l';

  await page.goto(
    `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}${IMAGE_SEARCH}${LARGE_IMAGES_ONLY}`
  );

  // read db to see who is at work
  const atWork = (await getCurrentAtWork()) > 0;

  // either a page screenshot or an img
  let data;
  if (atWork) {
    await page.evaluate(() => {
      // a selector to a safesearch button within the gear icon. may jeremy forgive us if this changes
      const button = document.querySelector(
        'div[jsaction="dXIA6:rY0YYb"] input'
      );
      button.click();
    });
    await page.waitForNavigation();
  }

  if (firstImageOnly) {
    // Click the first link to open the side panel
    try {
      await page.click('div.islrc > div > a');
    } catch (e) {
      if (atWork) {
        web.chat.postMessage({
          channel: event.channel,
          text: 'Nothing was found. (SafeSearch is on)',
        });
      }
    }
    // Get image directly from url
    const firstImageUrl = await page.evaluate(async () => {
      const img = document
        .getElementById('Sva75c') // the black sidebar
        .querySelector('img'); // the first img

      const waitToGetHiResImgSrc = () =>
        new Promise((resolve, reject) => {
          // Timeout 2 seconds and resolve the original src, in case our smart url checker never resolves.
          // Or if the img takes forever to load
          setTimeout(() => {
            resolve(img.src);
          }, 2000);

          const observer = new MutationObserver((mutations) => {
            resolve(mutations[0].target.src);
          });

          observer.observe(img, {
            attributeFilter: ['src'],
          });
        });

      const imgSrc = await waitToGetHiResImgSrc();
      return imgSrc;
    });
    if (firstImageUrl.startsWith('data:')) {
      data = await getScreenshotOfSingleImage(page, firstImageUrl);
      web.files.upload({
        channels: event.channel,
        file: data,
        filetype: 'auto',
        text: query,
        filename: query,
      });
    } else {
      web.chat.postMessage({
        channel: event.channel,
        text: firstImageUrl,
      });
    }
  } else {
    data = await page.screenshot();
    web.files.upload({
      channels: event.channel,
      file: data,
      filetype: 'auto',
      text: query,
      filename: query,
    });
  }

  browser.close();
};

module.exports = sendImagesScreenshot;

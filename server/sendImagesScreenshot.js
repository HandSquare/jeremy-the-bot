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
  setTimeout(() => {
    // after 60s close the browser to prevent mem leaks
    try {
      browser.close();
    } catch (e) {
      // unhandled
    }
  }, 60000);
  const page = await browser.newPage();
  page.setViewport({
    width: 1280,
    height: 1024,
  });

  const IMAGE_SEARCH = `&tbm=isch`;

  await page.goto(
    `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}${IMAGE_SEARCH}`
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

  data = await page.screenshot();
  web.files.upload({
    channels: event.channel,
    file: data,
    filetype: 'auto',
    text: query,
    filename: query,
  });

  browser.close();
};

module.exports = sendImagesScreenshot;

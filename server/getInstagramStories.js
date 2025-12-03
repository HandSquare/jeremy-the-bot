const puppeteer = require('puppeteer');
const { web } = require('./slackClient');
const { delay } = require('./util');

const getStoriesOfUser = async (event, user) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setViewport({
    width: 600,
    height: 800,
  });
  await page.goto(`https://www.instagram.com/stories/${user}/`);

  await delay(2000);
  const elems = await page.evaluate(() => {
    const divs = document.getElementsByTagName('div');
    const array = [...divs].map((item) => ({
      html: item.innerHTML,
      text: item.innerText,
      class: item.className,
    }));

    return array;
  });

  console.log(elems);
  const tapToPlayElement = divs.find((item) => item.html === 'Tap to play');
  console.log(tapToPlayElement);
  // await page.click(`div.[${tapToPlayClass}]`)

  let data = await page.screenshot();
  console.log(data);
  await browser.close();

  await web.filesUploadV2({
    channel_id: event.channel,
    file: data,
    filename: `${query}.png`,
  });
};

getStoriesOfUser(undefined, 'nicholas.irl');

module.exports = getStoriesOfUser;

const puppeteer = require("puppeteer");
const { web } = require("./slackClient");
let config;
try {
  config = require("../config.json");
} catch (e) {
  console.log("no config. this is expected if running from heroku");
}
let emojiList = [];

const getDefaultEmoji = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto("https://www.webfx.com/tools/emoji-cheat-sheet/");

  // eslint-disable-next-line no-undef
  const defaultEmoji = await page.evaluate(() =>
    [...document.getElementsByClassName("name")].map((elem) => elem.innerHTML)
  );
  browser.close();

  return defaultEmoji;
};

const getCustomEmoji = async () => {
  const customEmoji = await web.emoji.list({
    token: process.env.TOKEN || config.TOKEN,
  });

  return Object.keys(customEmoji.emoji);
};

const gatherEmoji = async () => {
  // const defaultEmoji = await getDefaultEmoji()
  const customEmoji = await getCustomEmoji();

  emojiList = [
    // ...defaultEmoji,
    ...customEmoji,
  ];
};

const getEmojiList = () => emojiList;

module.exports = {
  gatherEmoji,
  getEmojiList,
};

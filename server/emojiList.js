const { web } = require('./slackClient');

let emojiList = [];

const getCustomEmoji = async () => {
  const customEmoji = await web.emoji.list({
    token: process.env.TOKEN,
  });

  return Object.keys(customEmoji.emoji);
};

const gatherEmoji = async () => {
  const customEmoji = await getCustomEmoji();
  emojiList = [...customEmoji];
};

const getEmojiList = () => emojiList;

module.exports = {
  gatherEmoji,
  getEmojiList,
};

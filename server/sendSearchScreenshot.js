const sendPageScreenshot = require('./sendPageScreenshot');

const sendSearchScreenshot = async (event, query) => {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return sendPageScreenshot(event, url, query);
};

module.exports = sendSearchScreenshot;

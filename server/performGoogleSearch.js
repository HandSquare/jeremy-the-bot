const { customsearch } = require('@googleapis/customsearch');
const { web } = require('./slackClient');
const { getCurrentAtWork } = require('./util');

const apiKey = process.env.GOOGLE_SEARCH_KEY;
const customSearchId = process.env.GOOGLE_SEARCH_ID;

const search = customsearch('v1');

const getSearchImage = async (query, atWork) => {
  const res = await search.cse.list({
    cx: customSearchId,
    q: query,
    auth: apiKey,
    searchType: 'image',
    safe: atWork ? 'active' : 'off',
  });

  const firstImg = res.data.items[0].link;

  return firstImg;
};

const getSearchText = async (query) => {
  // read db to see who is at work
  const res = await search.cse.list({
    cx: customSearchId,
    q: query,
    auth: apiKey,
  });

  const { title, link, snippet } = res.data.items[0];
  return {
    title,
    link,
    snippet,
  };
};

const performGoogleImageSearch = async (event, query) => {
  const atWork = (await getCurrentAtWork()) > 0;
  const imgUrl = await getSearchImage(query, atWork);
  web.chat.postMessage({
    channel: event.channel,
    text: imgUrl,
    thread_ts: event.thread_ts,
  });
};

const performGoogleTextSearch = async (event, query) => {
  const { title, link, snippet } = await getSearchText(query);
  web.chat.postMessage({
    channel: event.channel,
    text: `<${link}|*${title}*>\n>${snippet}`,
    thread_ts: event.thread_ts,
  });
};

const go = async () => {
  const val = await getSearchText('dog');
  console.log(val);
};

module.exports = {
  performGoogleTextSearch,
  performGoogleImageSearch,
};

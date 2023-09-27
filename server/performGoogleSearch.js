const { customsearch } = require('@googleapis/customsearch');
const { web } = require('./slackClient');
const { getCurrentAtWork } = require('./util');

const apiKey = process.env.GOOGLE_SEARCH_KEY;
const customSearchId = process.env.GOOGLE_SEARCH_ID;

const search = customsearch('v1');

const getSearchImage = async (query) => {
  // read db to see who is at work
  const atWork = (await getCurrentAtWork()) > 0;

  const res = await search.cse.list({
    cx: customSearchId,
    q: query,
    auth: apiKey,
    searchType: 'image',
    safe: atWork ? 'active' : 'off',
  });

  console.log(res.data.items);
  const firstImg = res.data.items[0].link;

  return firstImg;
};

const performGoogleSearch = async (event, query) => {
  const imgUrl = await getSearchImage(query);
  web.chat.postMessage({
    channel: event.channel,
    text: imgUrl,
  });
};

const go = async () => {
  const val = await getSearchImage('dog');
  console.log(val);
};

// go();

module.exports = {
  performGoogleSearch,
};

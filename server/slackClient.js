const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');

const token = process.env.SLACK_BOT_TOKEN;

const rtm = new RTMClient(token);
const web = new WebClient(token);

module.exports = {
  rtm,
  web,
};

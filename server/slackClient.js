const { RTMClient } = require("@slack/rtm-api");
const { WebClient } = require("@slack/web-api");
let config;
try {
  config = require("../config.json");
} catch (e) {
  console.log("no config. this is expected if running from heroku");
}

const token = process.env.SLACK_BOT_TOKEN || config.BOT_TOKEN;

const rtm = new RTMClient(token);
const web = new WebClient(token);

module.exports = {
  rtm,
  web,
};

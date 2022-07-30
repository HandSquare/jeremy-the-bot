const app = require('express')();
const path = require('path');

require('dotenv').config();

const { web, rtm } = require('./slackClient');
const handleMessage = require('./handleMessage');
const { gatherEmoji } = require('./emojiList');
const handleReaction = require('./handleReaction');
const { getSelf, setSelf } = require('./self');
const { startStore } = require('./db');
const { startTimer } = require('./timer');

rtm.on('reaction_added', handleReaction);

rtm.on('message', handleMessage);

// Set up a webserver
app.listen(process.env.PORT);

const boot = async () => {
  const { self, team } = await rtm.start();
  gatherEmoji();
  setSelf(self);
};

// Boot immediately
boot();

// Start firebase
startStore();

// Start our clock event listener
startTimer();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/status', (req, res) => {
  console.log('got status ping');
  console.log(rtm.connected);
  if (rtm.connected) {
    console.log('send online');
    res.send({
      status: 'ONLINE',
    });
  } else {
    console.log('send offline');
    res.send({
      status: 'OFFLINE',
    });
  }
});

app.get('/status.png', (req, res) => {
  if (rtm.connected) {
    res.sendFile(path.join(__dirname, '../public/online.png'));
  } else {
    res.sendFile(path.join(__dirname, '../public/offline.png'));
  }
});

app.post('/start', async (req, res) => {
  await boot();
  res.sendStatus(200);
});

app.post('/stop', async (req, res) => {
  await rtm.disconnect();
  setSelf(undefined);
  res.sendStatus(200);
});

module.exports = {
  boot,
};

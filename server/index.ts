import express from 'express';
import path from 'path';

import 'dotenv/config';

import { rtm } from './slackClient';
import handleMessage from './handleMessage';
import { gatherEmoji } from './emojiList';
import handleReaction from './handleReaction';
import { setSelf } from './self';
import { SlackSelf } from './types';
import { startStore } from './db';
import { init as initMessageHistory } from './messageHistoryPersistence';
import { init as initPeople } from './people';
import { startTimer } from './timer';

const app = express();

// Resolve project root: __dirname is dist/server/ when compiled, so go up
// two levels; or one level from server/ when running source directly.
const PROJECT_ROOT = __dirname.includes('dist')
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');

rtm.on('reaction_added', handleReaction);

rtm.on('message', handleMessage);

// Set up a webserver
app.listen(process.env.PORT);

const boot = async (): Promise<void> => {
  await startStore();
  await initMessageHistory();
  await initPeople();
  const startResult = await rtm.start();
  const self = (startResult as any).self as SlackSelf;
  gatherEmoji();
  setSelf(self);
};

// Boot immediately
boot().catch((err) => {
  console.error('boot failed', err);
  process.exit(1);
});

// Start our clock event listener
startTimer();

app.get('/', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'public/index.html'));
});

app.get('/status', (_req, res) => {
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

app.get('/status.png', (_req, res) => {
  if (rtm.connected) {
    res.sendFile(path.join(PROJECT_ROOT, 'public/online.png'));
  } else {
    res.sendFile(path.join(PROJECT_ROOT, 'public/offline.png'));
  }
});

app.post('/start', async (_req, res) => {
  await boot();
  res.sendStatus(200);
});

app.post('/stop', async (_req, res) => {
  await rtm.disconnect();
  setSelf(undefined);
  res.sendStatus(200);
});

export { boot };

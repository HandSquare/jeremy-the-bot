import { web, rtm } from './server/slackClient';
import argsParser from 'args-parser';

const args = argsParser(process.argv);

console.info(args);

const go = async (): Promise<void> => {
  await rtm.start();
  await web.chat.postMessage({
    text: args.m,
    channel: args.c,
    as_user: false,
    username: args.u,
  });
  process.exit(0);
};

go();

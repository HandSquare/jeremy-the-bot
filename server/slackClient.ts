import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';

const token = process.env.SLACK_BOT_TOKEN!;

export const rtm = new RTMClient(token);
export const web = new WebClient(token);

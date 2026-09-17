import { SlackMessage } from './types';

// Slack may set thread_ts to a message's own ts when a top-level message has
// replies. Only a different thread_ts means the message is itself a reply.
export const isTopLevelMessage = (message: SlackMessage): boolean =>
  !message.thread_ts || message.thread_ts === message.ts;

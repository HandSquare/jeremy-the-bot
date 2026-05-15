/** Minimal Slack file attachment as seen on incoming messages. */
export interface SlackFile {
  id?: string;
  name?: string;
  mimetype?: string;
  filetype?: string;
  url_private?: string;
  url_private_download?: string;
}

/** A Slack message stored in channel history. */
export interface SlackMessage {
  ts: string;
  text?: string;
  user?: string;
  username?: string;
  subtype?: string;
  thread_ts?: string;
  channel?: string;
  bot_id?: string;
  files?: SlackFile[];
  message?: { text: string };
}

/** RTM message event — the shape we receive from @slack/rtm-api. */
export interface SlackMessageEvent {
  type?: string;
  subtype?: string;
  ts: string;
  text: string;
  user?: string;
  username?: string;
  channel: string;
  thread_ts?: string;
  bot_id?: string;
  files?: SlackFile[];
  message?: { text: string };
}

/** RTM reaction_added event. */
export interface SlackReactionEvent {
  type: string;
  user: string;
  reaction: string;
  item: {
    type: string;
    channel: string;
    ts: string;
  };
  event_ts: string;
}

/** Self identity returned by rtm.start(). */
export interface SlackSelf {
  id: string;
  name: string;
}

/** A command in the COMMANDS array. */
export interface Command {
  name: string;
  skipsAmbient?: boolean;
  match: (event: SlackMessageEvent) => any;
  handle: (event: SlackMessageEvent, matchResult: any) => void | Promise<void>;
}

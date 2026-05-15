import messageHistory from './messageHistory';
import {
  loadAllChannelHistories,
  saveChannelHistory,
  deleteChannelHistory,
} from './db';
import { SlackMessage, SlackFile } from './types';

const SAVE_DEBOUNCE_MS = 5000;
const isDM = (channelId: string) => channelId && channelId.startsWith('D');

const slimEvent = (e: SlackMessage): SlackMessage => {
  const slim: SlackMessage = {
    ts: e.ts,
    text: e.text,
    user: e.user,
    username: e.username,
    subtype: e.subtype,
    thread_ts: e.thread_ts,
    channel: e.channel,
  };
  if (e.files) {
    slim.files = e.files.map(
      (f): SlackFile => ({
        id: f.id,
        name: f.name,
        mimetype: f.mimetype,
        filetype: f.filetype,
        url_private: f.url_private,
        url_private_download: f.url_private_download,
      })
    );
  }
  if (e.message && e.message.text) {
    slim.message = { text: e.message.text };
  }
  return slim;
};

const pendingTimers: Record<string, ReturnType<typeof setTimeout>> = {};

const flushChannel = async (channelId: string): Promise<void> => {
  delete pendingTimers[channelId];
  const messages = (messageHistory[channelId] || []).map(slimEvent);
  try {
    await saveChannelHistory(channelId, messages);
  } catch (e: any) {
    console.log('saveChannelHistory error', channelId, e.message);
  }
};

export const markDirty = (channelId: string): void => {
  if (isDM(channelId)) return;
  if (pendingTimers[channelId]) clearTimeout(pendingTimers[channelId]);
  pendingTimers[channelId] = setTimeout(
    () => flushChannel(channelId),
    SAVE_DEBOUNCE_MS
  );
};

export const init = async (): Promise<void> => {
  try {
    const histories = await loadAllChannelHistories();
    let loaded = 0;
    let purged = 0;
    for (const [channelId, messages] of Object.entries(histories)) {
      if (isDM(channelId)) {
        await deleteChannelHistory(channelId).catch(() => {});
        purged++;
        continue;
      }
      messageHistory[channelId] = messages.slice(0, 10);
      loaded++;
    }
    console.log(
      `loaded message history for ${loaded} channels (purged ${purged} DM docs)`
    );
  } catch (e: any) {
    console.log('messageHistory init error', e.message);
  }
};

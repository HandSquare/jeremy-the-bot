import { web } from './slackClient';

// Track reactions we've added to avoid duplicates
const addedReactions = new Map<string, boolean>(); // message_ts+emoji -> boolean

export const addReactionOnce = async (
  channel: string,
  timestamp: string,
  name: string
): Promise<void> => {
  const key = `${timestamp}:${name}`;
  if (addedReactions.get(key)) return;

  try {
    await web.reactions.add({ channel, timestamp, name });
    addedReactions.set(key, true);
  } catch (e: any) {
    // Ignore "already_reacted" errors, log others
    if (!e.message?.includes('already_reacted')) {
      console.log('Reaction error:', e.message);
    }
  }
};

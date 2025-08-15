const { web } = require('./slackClient');

// Track reactions we've added to avoid duplicates
const addedReactions = new Map(); // message_ts+emoji -> boolean

const addReactionOnce = async (channel, timestamp, name) => {
  const key = `${timestamp}:${name}`;
  if (addedReactions.get(key)) return;

  try {
    await web.reactions.add({ channel, timestamp, name });
    addedReactions.set(key, true);
  } catch (e) {
    // Ignore "already_reacted" errors, log others
    if (!e.message?.includes('already_reacted')) {
      console.log('Reaction error:', e.message);
    }
  }
};

module.exports = { addReactionOnce };

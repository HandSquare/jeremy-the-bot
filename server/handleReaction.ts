import { getSelf } from './self';
import { delay } from './util';
import { web } from './slackClient';
import { SlackReactionEvent } from './types';

const handleReaction = async (event: SlackReactionEvent): Promise<void> => {
  // Don't react on top of self
  if (event.user === getSelf()?.id) return;

  // eggplant + hammer
  if (event.reaction === 'watermelon') {
    // React to the message
    try {
      await web.reactions.add({
        channel: event.item.channel,
        timestamp: event.item.ts,
        name: 'eggplant',
      });
    } catch (error) {
      console.log('An error occurred', error);
    }
    try {
      await web.reactions.add({
        channel: event.item.channel,
        timestamp: event.item.ts,
        name: 'hammer',
      });
    } catch (error) {
      console.log('An error occurred', error);
    }
  } else {
    await delay(3000);
    try {
      // React to the message, sometimes
      if (Math.random() > 0.5) {
        await web.reactions.add({
          channel: event.item.channel,
          timestamp: event.item.ts,
          name: event.reaction,
        });
      }
    } catch (error) {
      console.log('An error occurred', error);
    }
  }
};

export default handleReaction;

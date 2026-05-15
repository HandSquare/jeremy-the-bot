import { web } from './slackClient';

let emojiList: string[] = [];

const getCustomEmoji = async (): Promise<string[]> => {
  const customEmoji = await web.emoji.list({
    token: process.env.TOKEN,
  });

  return Object.keys(customEmoji.emoji!);
};

export const gatherEmoji = async (): Promise<void> => {
  const customEmoji = await getCustomEmoji();
  emojiList = [...customEmoji];
};

export const getEmojiList = (): string[] => emojiList;

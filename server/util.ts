import { getStateValue } from './db';
import http from 'http';
import https from 'https';
import { web } from './slackClient';

// Slack user type — just the fields we actually use
interface SlackUser {
  id: string;
  name: string;
  profile: { display_name: string };
}

let users: SlackUser[] | undefined = undefined; // dumb memoizer
export const getUsers = async (): Promise<SlackUser[]> => {
  if (!users) {
    const result = await web.users.list({});
    users = result.members as SlackUser[];
  }
  return users;
};

export const delay = (time: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, time));

export const getCurrentAtWork = async (): Promise<number> => {
  const newCurrentWork = await getStateValue('at_work');
  const currentlyAtWork = Object.values(
    newCurrentWork as Record<string, boolean>
  ).filter((v) => v === true).length;
  return currentlyAtWork;
};

export const getUsersCurrentlyAtWork = async (): Promise<SlackUser[]> => {
  const atWork = (await getStateValue('at_work')) as Record<string, boolean>;
  const allUsers = await getUsers();
  return Object.entries(atWork)
    .map(([id, val]) => {
      if (val === true) {
        return allUsers.find((user) => user.id === id);
      }
      return undefined;
    })
    .filter((i): i is SlackUser => !!i);
};

export const getBufferFromRequest = (url: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (resp) => {
        const dataArray: Buffer[] = [];
        resp.on('data', (data: Buffer) => {
          dataArray.push(data);
        });
        resp.on('end', () => {
          resolve(Buffer.concat(dataArray));
        });
      })
      .on('error', (e) => {
        reject(e.message);
      });
  });

export const makeNiceListFromArray = (arrayOfStrings: string[]): string => {
  if (arrayOfStrings.length === 0) return '';
  if (arrayOfStrings.length === 1) return arrayOfStrings[0];
  else if (arrayOfStrings.length === 2)
    return `${arrayOfStrings[0]} and ${arrayOfStrings[1]}`;
  else {
    return `${arrayOfStrings
      .slice(0, arrayOfStrings.length - 1)
      .join(', ')}, and ${arrayOfStrings[arrayOfStrings.length - 1]}`;
  }
};

export function extractImgUrl(text: string | undefined | null): string | null {
  if (!text) return null;
  const imageUrlPattern = /<([^>]*\.(?:jpg|gif|png|jpeg|bmp)[^>]*)>/g;

  const urls = text.match(imageUrlPattern);
  console.log({ text, urls });
  return urls ? urls[0].replace(/<|>/g, '') : null;
}

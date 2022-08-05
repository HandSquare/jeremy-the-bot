const { getStateValue, getState } = require('./db');
const http = require('http');
const https = require('https');
const { web } = require('./slackClient');

let users = undefined; // dumb memoizer
const getUsers = async () => {
  if (!users) users = await web.users.list();
  return users.members;
};

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const getCurrentAtWork = async () => {
  const newCurrentWork = await getStateValue('at_work');
  let currentlyAtWork = Object.values(newCurrentWork).filter(
    (v) => v === true
  ).length;
  return currentlyAtWork;
};

const getUsersCurrentlyAtWork = async () => {
  const atWork = await getStateValue('at_work');
  const users = await getUsers();
  return Object.entries(atWork)
    .map(([id, val]) => {
      if (val === true) {
        return users.find((user) => user.id === id);
      }
    })
    .filter((i) => !!i);
};

const getBufferFromRequest = (url) =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (resp) => {
        const dataArray = [];
        resp.on('data', (data) => {
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

const makeNiceListFromArray = (arrayOfStrings) => {
  if (arrayOfStrings.length === 0) return '';
  if (arrayOfStrings.length === 1) return arrayOfStrings[0];
  else if (arrayOfStrings.length === 2)
    return `${arrayOfStrings[0]} and ${arrayOfStrings[1]}`;
  else if (arrayOfStrings.length > 2) {
    return `${arrayOfStrings
      .slice(0, arrayOfStrings.length - 1)
      .join(', ')}, and ${arrayOfStrings[arrayOfStrings.length - 1]}`;
  }
};

module.exports = {
  delay,
  makeNiceListFromArray,
  getCurrentAtWork,
  getUsersCurrentlyAtWork,
  getBufferFromRequest,
};

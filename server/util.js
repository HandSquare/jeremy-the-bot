const { getStateValue } = require('./db');
const http = require('http');
const https = require('https');

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const getCurrentAtWork = async () => {
  const newCurrentWork = await getStateValue('at_work');
  let currentlyAtWork = Object.values(newCurrentWork).filter(
    (v) => v === true
  ).length;
  return currentlyAtWork;
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

module.exports = {
  delay,
  getCurrentAtWork,
  getBufferFromRequest,
};

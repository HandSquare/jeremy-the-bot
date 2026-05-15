const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, '..', '.cache', 'puppeteer');

const getExecutablePath = () => {
  const entries = fs
    .readdirSync(cacheDir)
    .filter((d) => d.startsWith('chrome-headless-shell-'));
  if (entries.length === 0) {
    throw new Error(
      'chrome-headless-shell not installed — run npm run postinstall'
    );
  }
  return path.join(cacheDir, entries[0], 'chrome-headless-shell');
};

const launchBrowser = () =>
  puppeteer.launch({
    headless: 'shell',
    executablePath: getExecutablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

module.exports = launchBrowser;

const puppeteer = require('puppeteer-core');
const {
  computeExecutablePath,
  Browser,
  detectBrowserPlatform,
  getInstalledBrowsers,
} = require('@puppeteer/browsers');
const path = require('path');

const cacheDir = path.join(__dirname, '..', '.cache', 'puppeteer');

let cachedPath;

const getExecutablePath = async () => {
  if (cachedPath) return cachedPath;
  const installed = await getInstalledBrowsers({ cacheDir });
  const shell = installed.find(
    (b) => b.browser === Browser.CHROMEHEADLESSSHELL
  );
  if (!shell)
    throw new Error(
      'chrome-headless-shell not installed — run npm run postinstall'
    );
  cachedPath = shell.executablePath;
  return cachedPath;
};

const launchBrowser = async () =>
  puppeteer.launch({
    headless: 'shell',
    executablePath: await getExecutablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

module.exports = launchBrowser;

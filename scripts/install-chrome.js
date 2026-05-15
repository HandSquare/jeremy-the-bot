const {
  install,
  Browser,
  resolveBuildId,
  detectBrowserPlatform,
} = require('@puppeteer/browsers');
const path = require('path');

const cacheDir = path.join(__dirname, '..', '.cache', 'puppeteer');

async function main() {
  const platform = detectBrowserPlatform();
  const buildId = await resolveBuildId(
    Browser.CHROMEHEADLESSSHELL,
    platform,
    'stable'
  );
  console.log(`installing chrome-headless-shell ${buildId} for ${platform}`);
  const result = await install({
    browser: Browser.CHROMEHEADLESSSHELL,
    buildId,
    cacheDir,
  });
  console.log('installed to', result.executablePath);
}

main().catch((err) => {
  console.error('chrome install failed:', err.message);
  process.exit(0);
});

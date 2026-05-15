const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const cacheDir = path.join(__dirname, '..', '.cache', 'puppeteer');
const binPath = path.join(cacheDir, 'chrome-headless-shell');

if (fs.existsSync(binPath)) {
  console.log('chrome-headless-shell already installed at', binPath);
  process.exit(0);
}

const platform =
  process.platform === 'linux'
    ? 'linux64'
    : process.platform === 'darwin'
    ? process.arch === 'arm64'
      ? 'mac-arm64'
      : 'mac-x64'
    : null;

if (!platform) {
  console.log(
    `unsupported platform ${process.platform}/${process.arch}, skipping`
  );
  process.exit(0);
}

const KNOWN_GOOD_URL = `https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json`;

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchJson(res.headers.location).then(resolve, reject);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });

const downloadAndExtract = (url, dest) =>
  new Promise((resolve, reject) => {
    const zipPath = dest + '.zip';
    https
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return downloadAndExtract(res.headers.location, dest).then(
            resolve,
            reject
          );
        }
        if (res.statusCode !== 200)
          return reject(new Error(`HTTP ${res.statusCode}`));
        const file = fs.createWriteStream(zipPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            execSync(`unzip -o -q "${zipPath}" -d "${dest}"`, {
              stdio: 'inherit',
            });
            fs.unlinkSync(zipPath);
            resolve();
          });
        });
      })
      .on('error', reject);
  });

async function main() {
  const info = await fetchJson(KNOWN_GOOD_URL);
  const channel = info.channels['Stable'];
  const downloads = channel.downloads['chrome-headless-shell'];
  const entry = downloads.find((d) => d.platform === platform);
  if (!entry) throw new Error(`no chrome-headless-shell for ${platform}`);

  console.log(
    `downloading chrome-headless-shell ${channel.version} for ${platform}`
  );
  fs.mkdirSync(cacheDir, { recursive: true });
  await downloadAndExtract(entry.url, cacheDir);

  const extractedDir = path.join(cacheDir, `chrome-headless-shell-${platform}`);
  const extractedBin = path.join(extractedDir, 'chrome-headless-shell');
  if (fs.existsSync(extractedBin)) {
    fs.chmodSync(extractedBin, 0o755);
  }
  console.log('installed to', extractedDir);
}

main().catch((err) => {
  console.error('chrome install failed:', err.message);
  process.exit(0);
});

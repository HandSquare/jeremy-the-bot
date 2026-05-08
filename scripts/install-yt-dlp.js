const fs = require('fs');
const path = require('path');
const https = require('https');

const target = path.join(__dirname, '..', 'bin', 'yt-dlp');

if (process.platform !== 'linux') {
  console.log(
    `skipping yt-dlp install on ${process.platform} (assumes system yt-dlp for dev)`
  );
  process.exit(0);
}

if (process.env.SKIP_YT_DLP_INSTALL === '1') {
  console.log('SKIP_YT_DLP_INSTALL=1, skipping');
  process.exit(0);
}

const url =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

fs.mkdirSync(path.dirname(target), { recursive: true });

const download = (sourceUrl, redirectsLeft = 5) =>
  new Promise((resolve, reject) => {
    https
      .get(sourceUrl, (res) => {
        if (
          (res.statusCode === 301 || res.statusCode === 302) &&
          res.headers.location
        ) {
          if (redirectsLeft <= 0)
            return reject(new Error('too many redirects'));
          return download(res.headers.location, redirectsLeft - 1).then(
            resolve,
            reject
          );
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const file = fs.createWriteStream(target, { mode: 0o755 });
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', reject);
      })
      .on('error', reject);
  });

console.log('downloading yt-dlp from', url);
download(url)
  .then(() => {
    console.log('yt-dlp installed to', target);
  })
  .catch((err) => {
    console.error('yt-dlp install failed:', err.message);
    // Don't fail the deploy — bot still boots, just can't grab videos.
    process.exit(0);
  });

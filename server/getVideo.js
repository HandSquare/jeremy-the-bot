const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { web } = require('./slackClient');
const { addReactionOnce } = require('./reactionUtils');

const LOCAL_YT_DLP = path.join(__dirname, '..', 'bin', 'yt-dlp');
const ytDlpBin = fs.existsSync(LOCAL_YT_DLP) ? LOCAL_YT_DLP : 'yt-dlp';

const downloadWithYtDlp = (url, outPath) =>
  new Promise((resolve, reject) => {
    const proc = spawn(ytDlpBin, [
      '--no-warnings',
      '--no-playlist',
      '-f',
      'mp4/best',
      '-o',
      outPath,
      url,
    ]);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-500)}`));
    });
  });

const RATE_LIMIT_RETRY_MS = 30_000;
const isRateLimitError = (err) =>
  /rate-limit|rate limit|429|too many requests|login required/i.test(
    err.message || ''
  );

const isNoMediaError = (err) =>
  /no video|no media|unsupported url|there's no video|unable to extract/i.test(
    err.message || ''
  );

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async (event, url) => {
  await addReactionOnce(event.channel, event.ts, 'eyes');

  const id = `video-${Date.now()}`;
  const outPath = path.join(os.tmpdir(), `${id}.mp4`);

  try {
    try {
      await downloadWithYtDlp(url, outPath);
    } catch (e) {
      if (!isRateLimitError(e)) throw e;
      console.log('getVideo rate-limited, retrying in 30s:', e.message);
      await sleep(RATE_LIMIT_RETRY_MS);
      await downloadWithYtDlp(url, outPath);
    }
    const buffer = fs.readFileSync(outPath);
    await web.filesUploadV2({
      channel_id: event.channel,
      file: buffer,
      filename: `${id}.mp4`,
      thread_ts: event.thread_ts,
    });
  } catch (e) {
    if (isNoMediaError(e)) {
      console.log('getVideo no media, skipping:', url);
      web.reactions
        .remove({
          channel: event.channel,
          timestamp: event.ts,
          name: 'eyes',
        })
        .catch(() => {});
    } else {
      console.log('getVideo error', e.message);
      await web.chat.postMessage({
        text: `couldn't grab that one: ${e.message}`,
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
    }
  } finally {
    fs.promises.unlink(outPath).catch(() => {});
  }
};

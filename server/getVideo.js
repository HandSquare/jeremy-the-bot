const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { web } = require('./slackClient');
const { addReactionOnce } = require('./reactionUtils');

const downloadWithYtDlp = (url, outPath) =>
  new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [
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

module.exports = async (event, url) => {
  await addReactionOnce(event.channel, event.ts, 'eyes');

  const id = `video-${Date.now()}`;
  const outPath = path.join(os.tmpdir(), `${id}.mp4`);

  try {
    await downloadWithYtDlp(url, outPath);
    const buffer = fs.readFileSync(outPath);
    await web.filesUploadV2({
      channel_id: event.channel,
      file: buffer,
      filename: `${id}.mp4`,
      thread_ts: event.thread_ts,
    });
  } catch (e) {
    console.log('getVideo error', e.message);
    await web.chat.postMessage({
      text: `couldn't grab that one: ${e.message}`,
      channel: event.channel,
      thread_ts: event.thread_ts,
    });
  } finally {
    fs.promises.unlink(outPath).catch(() => {});
  }
};

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { web } from './slackClient';
import { addReactionOnce } from './reactionUtils';
import { SlackMessageEvent } from './types';

// Resolve project root: __dirname is dist/server/ when compiled
const PROJECT_ROOT = __dirname.includes('dist')
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');
const LOCAL_YT_DLP = path.join(PROJECT_ROOT, 'bin', 'yt-dlp');
const ytDlpBin = fs.existsSync(LOCAL_YT_DLP) ? LOCAL_YT_DLP : 'yt-dlp';

const downloadWithYtDlp = (url: string, outPath: string): Promise<void> =>
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
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-500)}`));
    });
  });

const RATE_LIMIT_RETRY_MS = 30_000;
const GENERAL_RETRY_MS = 120_000;
const isRateLimitError = (err: Error) =>
  /rate-limit|rate limit|429|too many requests|login required/i.test(
    err.message || ''
  );

const isNoMediaError = (err: Error) =>
  /no video|no media|unsupported url|there's no video|unable to extract/i.test(
    err.message || ''
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const getVideo = async (
  event: SlackMessageEvent,
  url: string
): Promise<void> => {
  await addReactionOnce(event.channel, event.ts, 'eyes');

  const id = `video-${Date.now()}`;
  const outPath = path.join(os.tmpdir(), `${id}.mp4`);

  try {
    try {
      await downloadWithYtDlp(url, outPath);
    } catch (e: any) {
      if (!isRateLimitError(e)) throw e;
      console.log('getVideo rate-limited, retrying in 30s:', e.message);
      await sleep(RATE_LIMIT_RETRY_MS);
      await downloadWithYtDlp(url, outPath);
    }
    const buffer = fs.readFileSync(outPath);
    const uploadArgs = {
      channel_id: event.channel,
      file: buffer,
      filename: `${id}.mp4`,
    } as any;
    if (event.thread_ts) uploadArgs.thread_ts = event.thread_ts;
    await web.filesUploadV2(uploadArgs);
  } catch (e: any) {
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
      console.log('getVideo error, will retry in 2 min:', e.message);
      await web.chat.postMessage({
        text: "this isn't working right now but i'll try again in a bit",
        channel: event.channel,
        thread_ts: event.thread_ts,
      });
      for (let attempt = 1; attempt <= 2; attempt++) {
        await sleep(GENERAL_RETRY_MS);
        try {
          await downloadWithYtDlp(url, outPath);
          const retryBuffer = fs.readFileSync(outPath);
          const retryArgs = {
            channel_id: event.channel,
            file: retryBuffer,
            filename: `${id}.mp4`,
          } as any;
          if (event.thread_ts) retryArgs.thread_ts = event.thread_ts;
          await web.filesUploadV2(retryArgs);
          break;
        } catch (retryErr: any) {
          console.log(`getVideo retry ${attempt}/2 failed:`, retryErr.message);
        }
      }
    }
  } finally {
    fs.promises.unlink(outPath).catch(() => {});
  }
};

export default getVideo;

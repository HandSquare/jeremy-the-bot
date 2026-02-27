# Jeremy the Bot

Slack bot that responds to messages with AI-generated text, images, and screenshots.

## Deployment

- **Platform**: Railway (GitHub integration)
- **Deploys on**: push to `master` — Railway auto-deploys from the remote repo
- **`railway up` and `railway redeploy`**: these deploy from LOCAL files, NOT from GitHub. To trigger a proper deploy, push to master.
- **Railway project**: https://railway.com/project/a5fe0f01-031a-4254-96ce-a1e19cf42433

## Architecture

- Stateless Node.js process (no database besides Firebase for config)
- Uses Slack RTM API (`@slack/rtm-api`) for real-time message listening
- Uses Slack Web API (`@slack/web-api` v7) for posting messages and uploading files
- Entry point: `server/index.js`
- Listens on `process.env.PORT`

## Key Files

- `server/slackClient.js` — RTM + Web client setup
- `server/getDallEImage.js` — image generation (OpenAI `gpt-image-1.5`)
- `server/getChatbot.js` — chat responses (OpenAI `gpt-5-mini`)
- `server/shouldRespond.js` — decides if Jeremy should reply (`gpt-5-nano`)
- `server/describeImage.js` — image description (`gpt-4o`)
- `server/sendPageScreenshot.js` — puppeteer page screenshots
- `server/sendImagesScreenshot.js` — puppeteer image screenshots

## Slack File Uploads

Slack deprecated `files.upload`. This project uses `web.filesUploadV2()` which wraps the new 3-step upload flow (getUploadURLExternal → POST → completeUploadExternal). Requires `@slack/web-api` v7+.

## Env Vars

All set in Railway dashboard/CLI:

- `OPENAI_API_KEY`, `SLACK_BOT_TOKEN`, `TOKEN`
- `GOOGLE_SEARCH_KEY`, `GOOGLE_SEARCH_ID`
- Firebase service account: `TYPE`, `PROJECT_ID`, `PRIVATE_KEY_ID`, `PRIVATE_KEY`, `CLIENT_EMAIL`, `CLIENT_ID`, `AUTH_URI`, `TOKEN_URI`, `AUTH_PROVIDER_X509_CERT_URL`, `CLIENT_X509_CERT_URL`
- `PORT` — set automatically by Railway

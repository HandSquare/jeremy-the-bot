# Jeremy the Bot

Slack bot that responds to messages with AI-generated text, images, and link previews.

## Deployment

- **Platform**: Railway (GitHub integration)
- **Deploys on**: push to `master` — Railway auto-deploys from the remote repo
- **`railway up` and `railway redeploy`**: these deploy from LOCAL files, NOT from GitHub. To trigger a proper deploy, push to master.
- **Railway project**: https://railway.com/project/a5fe0f01-031a-4254-96ce-a1e19cf42433
- **TypeScript branch**: `typescript-migration` — requires `npm run build` before `npm start`

## Architecture

- Stateless Node.js process (Firestore for config + message history + people dictionary)
- Uses Slack RTM API (`@slack/rtm-api`) for real-time message listening
- Uses Slack Web API (`@slack/web-api` v7) for posting messages and uploading files
- Command routing: `server/commands.ts` — flat `COMMANDS` array, first match wins
- Entry point: `server/index.ts`
- Listens on `process.env.PORT`

## Key Files

- `server/commands.ts` — all command matchers and handlers
- `server/types.ts` — shared TypeScript interfaces (SlackMessage, Command, etc.)
- `server/handleMessage.ts` — message bookkeeping, ambient behaviors (greetings, emoji)
- `server/slackClient.ts` — RTM + Web client setup
- `server/getDallEImage.ts` — image generation (OpenAI `gpt-image-2`)
- `server/getImageEdit.ts` — image editing (OpenAI `gpt-image-2`)
- `server/getChatbot.ts` — chat responses (OpenAI `gpt-5.4-mini`)
- `server/describeImage.ts` — image description (OpenAI `gpt-5.4-mini`)
- `server/generateSlug.ts` — short filename slugs (OpenAI `gpt-5.4-nano`)
- `server/getVideo.ts` — video downloads via `yt-dlp` (Instagram, TikTok, X)
- `server/people.ts` — Firestore-backed people dictionary with prompt substitution
- `server/messageHistoryPersistence.ts` — Firestore persistence for message history
- `server/sendPageScreenshot.ts` — link previews via thum.io (screenshot API)
- `server/performGoogleSearch.ts` — Google image/text search with reachability check

## Slack File Uploads

Slack deprecated `files.upload`. This project uses `web.filesUploadV2()` which wraps the new 3-step upload flow (getUploadURLExternal → POST → completeUploadExternal). Requires `@slack/web-api` v7+.

## Env Vars

All set in Railway dashboard/CLI:

- `OPENAI_API_KEY`, `SLACK_BOT_TOKEN`, `TOKEN`
- `GOOGLE_SEARCH_KEY`, `GOOGLE_SEARCH_ID`
- Firebase service account: `TYPE`, `PROJECT_ID`, `PRIVATE_KEY_ID`, `PRIVATE_KEY`, `CLIENT_EMAIL`, `CLIENT_ID`, `AUTH_URI`, `TOKEN_URI`, `AUTH_PROVIDER_X509_CERT_URL`, `CLIENT_X509_CERT_URL`
- `PORT` — set automatically by Railway

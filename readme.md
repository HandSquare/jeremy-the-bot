# Jeremy

Jeremy is a chatbot for Slack in continuous development. He's just a regular guy!

Run `npm start` after cloning to start Jeremy locally.  
He is also running online at https://jeremy-the-bot-production.up.railway.app/ so you can pause him there.

There's a `.env` of client secrets that you'll need to put in the root directory. It's on the github marked as private.

## Commands

Most commands are triggered by a leading comma in the message (e.g. `, generate a cat`). Some respond to natural-language phrases.

### Images

- `, generate <prompt>` — generate an image with `gpt-image-2`. If you attach an image to the same message, edits that image instead.
- `, edit <prompt>` — edit the most recent image in the channel or thread, or an image attached to the same message (thread-aware lookup; falls back to fetching channel/thread history if not in local memory).
- `, enhance` — zoom into the center of the most recent image. (RIP CSI joke.)
- `what's this` — describe an image attached to the same message.
- `what's that` — describe the most recent image in the thread (or channel). Falls back to a Google image search of the previous message text if there's no image.
- `, generate that` — generate using the previous message's text as the prompt.

Filenames are auto-summarized to a short slug via `gpt-5-nano` so Slack doesn't truncate long prompts.

### People dictionary

Define aliases that get substituted into image prompts and injected into chat context. Useful for memes of each other.

- `, define "Nick" "a half-chinese artsy web developer"` — saves the alias and sends a portrait of the description back as a sanity-check.
- `, who is Nick` — read the description back.
- `, forget Nick` — delete.

When a known alias appears in a `, generate` / `, edit` prompt, Jeremy prepends a `CHARACTERS:` preamble so the image model has an explicit cast list:

```
CHARACTERS: Nick = a half-chinese artsy web developer, Bob = a tall musician.

Nick and Bob having dinner.
```

The dictionary is also injected as system context for the chatbot, so Jeremy can reference people naturally in conversation.

### Auto-downloads

Posting any of these URLs in a message auto-downloads the video via `yt-dlp` and re-uploads it to the channel:

- Instagram reels and posts (`instagram.com/reel/...`, `instagram.com/p/...`)
- TikTok videos (full and short links)
- X / Twitter status URLs

### Search

- `, pull up <query>` — Google image search.
- `, pull up X or Y` — randomly picks one of the two.
- `, pull that up` — image-search the previous message's text.
- `, look up <query>` — Google text search.
- `what means <X>` — image search of X.
- `, preview that link` — puppeteer-screenshots the URL in the previous message.

### Chat

- `jeremy, <anything>` — chat with Jeremy (`gpt-5-mini`).
- Replying inside a thread Jeremy started will continue the conversation.
- Greetings (`hi jeremy` / `hello jeremy`), thanks (`thanks` / `nice`), and matching emoji-reactions to keywords are all sprinkled in.

### SafeSearch / "at work" mode

- `I am at work!` — turns SafeSearch on while at least one person is at work.
- `I am no longer at work!` — toggles you out.
- `Who is at work?` — lists current at-work users.
- 6:30 PM ET — auto-clears the at-work list.
- 4:20 PM ET — Jeremy makes a joke if there's been recent activity.

## Architecture

Routing lives in `server/commands.js` as a flat `COMMANDS` array of `{name, match, handle}` entries. First match wins, then ambient behaviors (waves, greetings, emoji reactions) run unless the command sets `skipsAmbient`.

## State

- Per-channel message history (last 10 messages) persists in Firestore between restarts. DMs are skipped — they stay in-memory only and are never written to disk.
- `at_work` membership and the people dictionary are also stored in Firestore (`main/state`).

## Current Status

![](https://jeremy-the-bot-production.up.railway.app/status.png?cache=none)

bump

# Jeremy

Jeremy is a chatbot for Slack in continuous development. He's just a regular guy!

Run `npm start` after cloning to start Jeremy locally.  
He is also running online at https://jeremy-the-bot-production.up.railway.app/ so you can pause him there.

There's a `.env` of client secrets that you'll need to put in the root directory. It's on the github marked as private.

## Commands

Most commands are triggered by a leading comma in the message (e.g. `, generate a cat`). Some respond to natural-language phrases.

### Images

- `, generate <prompt>` — generate an image with `gpt-image-2`. If you attach an image to the same message, edits that image instead.
- `, edit <prompt>` — edit the most recent image in the channel or thread (thread-aware lookup; falls back to fetching channel/thread history if not in local memory).
- `, enhance` — zoom into the center of the most recent image. (RIP CSI joke.)
- `what's that` — describe the most recent image with `gpt-4o`. Falls back to a Google image search of the previous message text if there's no image.
- `, generate that` — generate using the previous message's text as the prompt.

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

## State

- Per-channel message history (last 10 messages) persists in Firestore between restarts. DMs are skipped — they stay in-memory only and are never written to disk.
- `at_work` membership is also stored in Firestore.

## Current Status

![](https://jeremy-the-bot-production.up.railway.app/status.png?cache=none)

bump

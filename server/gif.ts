// Animated GIF output for GPT Image 2.6 (`output_format: 'gif'`).
// The installed openai SDK doesn't type `gif` or the frame params yet,
// so callers spread these into the request with a cast.

// 12 frames x 100ms = a 1.2s loop: snappy enough to read as a reaction GIF.
const GIF_FRAME_COUNT = 12;
const GIF_FRAME_DURATION_MS = 100;
// Per-frame size (must be a multiple of 16). Kept small to stay inside the
// per-request pixel budget and keep Slack uploads light.
const GIF_FRAME_SIZE = '512x512';

export const GIF_REQUEST_PARAMS = {
  output_format: 'gif',
  frame_count: GIF_FRAME_COUNT,
  frame_duration_ms: GIF_FRAME_DURATION_MS,
  size: GIF_FRAME_SIZE,
};

// There's no API loop flag; looping is controlled entirely by the prompt.
export const toGifPrompt = (prompt: string): string =>
  `${prompt}. Make this a short, seamlessly looping reaction GIF: one clear, ` +
  'exaggerated action that ends exactly where it started so it loops cleanly. ' +
  'Fixed camera, same character design, lighting and background in every frame. ' +
  'No text, captions or borders unless the request asks for them.';

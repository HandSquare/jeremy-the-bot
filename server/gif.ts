// Animated GIF output for GPT Image 2.6 (`output_format: 'gif'`).
// The installed openai SDK doesn't type `gif` or the frame params yet,
// so callers spread these into the request with a cast.

// 16 frames (the API max) x 150ms = a 2.4s animation.
const GIF_FRAME_COUNT = 16;
const GIF_FRAME_DURATION_MS = 150;
// Per-frame size (must be a multiple of 16). Kept small to stay inside the
// per-request pixel budget and keep Slack uploads light.
const GIF_FRAME_SIZE = '512x512';

export const GIF_REQUEST_PARAMS = {
  output_format: 'gif',
  frame_count: GIF_FRAME_COUNT,
  frame_duration_ms: GIF_FRAME_DURATION_MS,
  size: GIF_FRAME_SIZE,
};

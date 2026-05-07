const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FALLBACK = 'image';
const MAX_LEN = 14;

module.exports = async (prompt) => {
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      instructions: `Generate a short slug (1-3 words, lowercase, hyphens between words, max ${MAX_LEN} chars total) summarizing this image prompt for use as a filename. Reply with only the slug, no extension, no punctuation.`,
      input: prompt,
    });
    const raw = (response.output_text || '').trim().toLowerCase();
    const slug = raw.replace(/[^a-z0-9-]/g, '').slice(0, MAX_LEN);
    return slug || FALLBACK;
  } catch (e) {
    console.log('generateSlug error', e.message);
    return FALLBACK;
  }
};

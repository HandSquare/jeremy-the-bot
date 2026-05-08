const admin = require('firebase-admin');
const { getStateValue, updateState } = require('./db');

let cache = {};

const init = async () => {
  try {
    cache = (await getStateValue('people')) || {};
    console.log(`loaded ${Object.keys(cache).length} people`);
  } catch (e) {
    console.log('people init error', e.message);
    cache = {};
  }
};

const get = (name) => {
  const key = Object.keys(cache).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? cache[key] : null;
};

const set = async (name, description) => {
  const existing = Object.keys(cache).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  const key = existing || name;
  cache[key] = description;
  await updateState({ [`people.${key}`]: description });
};

const remove = async (name) => {
  const key = Object.keys(cache).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  if (!key) return false;
  delete cache[key];
  await updateState({
    [`people.${key}`]: admin.firestore.FieldValue.delete(),
  });
  return true;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Replace each known name in the text with its description. Single pass,
// word-bounded, case-insensitive.
// Prepend a CHARACTERS: preamble defining each known name, then keep the
// user's prompt body using their actual names (canonical capitalization).
// Forces the image model to render persons (even for weird descriptions
// like "physical manifestation of it's over") and gives an explicit cast
// list so multi-person scenes compose cleanly.
const substitute = (text) => {
  if (!text) return text;
  const names = Object.keys(cache);
  if (names.length === 0) return text;
  const regex = new RegExp(`\\b(${names.map(escapeRegex).join('|')})\\b`, 'gi');

  // First pass: collect unique names in order of appearance (canonical form)
  const mentioned = [];
  const seen = new Set();
  text.replace(regex, (match) => {
    const key = names.find((k) => k.toLowerCase() === match.toLowerCase());
    if (key && !seen.has(key)) {
      seen.add(key);
      mentioned.push(key);
    }
    return match;
  });

  if (mentioned.length === 0) return text;

  const characterDefs = mentioned
    .map((name) => `${name} = ${cache[name]}`)
    .join(', ');

  // Normalize occurrences in the body to the canonical capitalization,
  // so the prompt and CHARACTERS preamble use the same form.
  const normalized = text.replace(regex, (match) => {
    const key = names.find((k) => k.toLowerCase() === match.toLowerCase());
    return key || match;
  });

  return `CHARACTERS: ${characterDefs}.\n\n${normalized}`;
};

const all = () => ({ ...cache });

module.exports = { init, get, set, remove, substitute, all };

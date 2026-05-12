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
// Replace each known name with [description] so the image model treats the
// description as a single compositional unit. No preamble text (image models
// render preambles as literal text in the image).
const substitute = (text) => {
  if (!text) return text;
  const names = Object.keys(cache);
  if (names.length === 0) return text;
  const regex = new RegExp(`\\b(${names.map(escapeRegex).join('|')})\\b`, 'gi');
  return text.replace(regex, (match) => {
    const key = names.find((k) => k.toLowerCase() === match.toLowerCase());
    return key ? `[${cache[key]}]` : match;
  });
};

const all = () => ({ ...cache });

module.exports = { init, get, set, remove, substitute, all };

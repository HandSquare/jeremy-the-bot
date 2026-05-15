import * as admin from 'firebase-admin';
import { getStateValue, updateState } from './db';

let cache: Record<string, string> = {};

export const init = async (): Promise<void> => {
  try {
    cache = (await getStateValue('people')) || {};
    console.log(`loaded ${Object.keys(cache).length} people`);
  } catch (e: any) {
    console.log('people init error', e.message);
    cache = {};
  }
};

export const get = (name: string): string | null => {
  const key = Object.keys(cache).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? cache[key] : null;
};

export const set = async (name: string, description: string): Promise<void> => {
  const existing = Object.keys(cache).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  const key = existing || name;
  cache[key] = description;
  await updateState({ [`people.${key}`]: description });
};

export const remove = async (name: string): Promise<boolean> => {
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

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Replace each known name in the text with its description. Single pass,
// word-bounded, case-insensitive.
// Replace each known name with [description] so the image model treats the
// description as a single compositional unit. No preamble text (image models
// render preambles as literal text in the image).
export const substitute = (text: string): string => {
  if (!text) return text;
  const names = Object.keys(cache);
  if (names.length === 0) return text;
  const regex = new RegExp(`\\b(${names.map(escapeRegex).join('|')})\\b`, 'gi');
  return text.replace(regex, (match) => {
    const key = names.find((k) => k.toLowerCase() === match.toLowerCase());
    return key ? `[${cache[key]}]` : match;
  });
};

export const all = (): Record<string, string> => ({ ...cache });

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

const findMatchedNames = (text: string): string[] => {
  const names = Object.keys(cache);
  if (names.length === 0) return [];
  const regex = new RegExp(`\\b(${names.map(escapeRegex).join('|')})\\b`, 'gi');
  const matched = new Set<string>();
  for (const m of text.matchAll(regex)) {
    const key = names.find((k) => k.toLowerCase() === m[1].toLowerCase());
    if (key) matched.add(key);
  }
  return [...matched];
};

// Resolve people references for image prompts. Replaces matched names with
// their [description] inline and prepends a character list so the model treats
// each person as a distinct character (including cross-references).
export const resolveImagePrompt = (text: string): string => {
  if (!text) return text;
  const names = Object.keys(cache);
  if (names.length === 0) return text;

  const regex = new RegExp(`\\b(${names.map(escapeRegex).join('|')})\\b`, 'gi');
  const resolved = text.replace(regex, (match) => {
    const key = names.find((k) => k.toLowerCase() === match.toLowerCase());
    return key ? `[${cache[key]}]` : match;
  });

  // Collect every referenced person: names in the original prompt + names
  // inside matched definitions (cross-references like "standing next to Bob").
  const directMatches = findMatchedNames(text);
  const allReferenced = new Set(directMatches);
  for (const name of directMatches) {
    for (const ref of findMatchedNames(cache[name])) {
      allReferenced.add(ref);
    }
  }

  if (allReferenced.size === 0) return resolved;

  const charList = [...allReferenced]
    .map((n) => `- ${n}: ${cache[n]}`)
    .join('\n');
  return (
    `Characters in this scene (each is a separate, distinct person):\n${charList}\n\n` +
    `${resolved}\n\n` +
    "Text in [brackets] describes a specific character's appearance. Each bracketed description is a different person — do not merge or blend them. Do not render bracketed text as visible text or labels."
  );
};

export const all = (): Record<string, string> => ({ ...cache });

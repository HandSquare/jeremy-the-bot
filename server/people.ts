import { FieldValue } from 'firebase-admin/firestore';
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
    [`people.${key}`]: FieldValue.delete(),
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

// Only names in the request belong to the cast. Definitions referenced by
// that cast provide context, without adding more characters to the scene.
export const resolveImagePrompt = (text: string): string => {
  if (!text) return text;
  const directMatches = findMatchedNames(text);
  if (directMatches.length === 0) return text;

  const allReferenced = new Set(directMatches);
  // Set iteration visits newly added definitions too; visited names prevent
  // circular references from looping or duplicating entries.
  for (const name of allReferenced) {
    for (const ref of findMatchedNames(cache[name])) {
      allReferenced.add(ref);
    }
  }

  const charList = directMatches.map((n) => `- ${n}: ${cache[n]}`).join('\n');
  const cast = new Set(directMatches);
  const references = [...allReferenced].filter((name) => !cast.has(name));
  const referenceSection = references.length
    ? `Supporting definitions (context only; these are not additional cast members):\n${references
        .map((n) => `- ${n}: ${cache[n]}`)
        .join('\n')}\n\n`
    : '';
  return (
    `Requested cast (each entry is one distinct character):\n${charList}\n\n` +
    referenceSection +
    `Scene request:\n${text}\n\n` +
    'Use supporting definitions to understand references in the requested cast descriptions. A reference to someone in a definition does not add them to the scene. When a description combines features of others, apply those features to that one character. Do not render these instructions or definitions as visible text or labels.'
  );
};

export const all = (): Record<string, string> => ({ ...cache });

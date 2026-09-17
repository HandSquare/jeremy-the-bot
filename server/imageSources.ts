import { SlackFile, SlackMessage, SlackMessageEvent } from './types';

export type MessageImageSource =
  | { kind: 'slack-file'; file: SlackFile }
  | { kind: 'url'; url: string };

const IMAGE_FILETYPES = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']);

const isImageFile = (file: SlackFile): boolean =>
  (file.mimetype || '').startsWith('image/') ||
  IMAGE_FILETYPES.has((file.filetype || '').toLowerCase());

const imageUrlFromText = (text?: string): string | null => {
  if (!text) return null;
  const urls = text.match(/https?:\/\/[^\s<>]+/g) || [];
  return (
    urls.find((url) => {
      try {
        return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(new URL(url).pathname);
      } catch {
        return false;
      }
    }) || null
  );
};

export const getMessageImageSources = (
  message: SlackMessageEvent | SlackMessage
): MessageImageSource[] => {
  const sources: MessageImageSource[] = (message.files || [])
    .filter(isImageFile)
    .map((file) => ({ kind: 'slack-file' as const, file }));

  for (const attachment of message.attachments || []) {
    const url = attachment.image_url || attachment.thumb_url;
    if (url) sources.push({ kind: 'url', url });
  }

  const textUrl = imageUrlFromText(message.text || message.message?.text);
  if (textUrl) sources.push({ kind: 'url', url: textUrl });

  return sources.filter(
    (source, index, all) =>
      source.kind === 'slack-file' ||
      all.findIndex(
        (other) => other.kind === 'url' && other.url === source.url
      ) === index
  );
};

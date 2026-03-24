import type { IndexDocumentInput } from '../types/domain.js';

export interface CreateDocumentIdOptions {
  prefix?: string;
  timestamp?: Date;
  maxSlugLength?: number;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function extractUrlSlug(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/').map((segment) => segment.trim()).filter(Boolean);
    return pathSegments.at(-1) ?? parsedUrl.hostname;
  } catch {
    return url;
  }
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toISOString().replace(/[-:.]/g, '').toLowerCase();
}

export function createDocumentId(
  input: Pick<IndexDocumentInput, 'title' | 'url'>,
  options: CreateDocumentIdOptions = {}
) {
  const title = input.title?.trim();
  const slugSource = title !== undefined && title.length > 0 ? title : extractUrlSlug(input.url);
  const normalizedSlug = slugify(slugSource);
  const maxSlugLength = options.maxSlugLength ?? 48;
  const slugCandidate = normalizedSlug.slice(0, maxSlugLength);
  const slug = slugCandidate.length > 0 ? slugCandidate : 'document';
  const prefix = options.prefix ?? 'doc';
  const timestamp = options.timestamp ?? new Date();

  return `${prefix}-${slug}-${formatTimestamp(timestamp)}`;
}

export function slugifyDocumentSegment(value: string) {
  return slugify(value);
}

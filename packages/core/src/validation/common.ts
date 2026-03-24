import { z } from 'zod';

export const inputLimits = {
  url: 2048,
  documentId: 128,
  title: 200,
  body: 20000,
  summary: 1000,
  purpose: 500,
  snippet: 500,
  trackingToken: 512,
  message: 4000,
  chatHistoryMessages: 20,
  sourceRefs: 10,
  snippetsPerSource: 5
} as const;

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
}

export function optionalTrimmedString(maxLength: number, fieldName: string) {
  return z.preprocess(
    normalizeOptionalString,
    z.string().max(maxLength, `${fieldName} must be at most ${maxLength} characters`).optional()
  );
}

export function requiredTrimmedString(maxLength: number, fieldName: string) {
  return z
    .string({ required_error: `${fieldName} is required` })
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`);
}

export const normalizedUrlSchema = z
  .string({ required_error: 'URL is required' })
  .trim()
  .min(1, 'URL is required')
  .max(inputLimits.url, `URL must be at most ${inputLimits.url} characters`)
  .regex(/^https?:\/\/.+/i, 'URL must start with http:// or https://');

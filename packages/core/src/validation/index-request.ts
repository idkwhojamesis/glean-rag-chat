import { z } from 'zod';

import { documentTypeValues, type IndexDocumentInput } from '../types/domain.js';
import { inputLimits, normalizedUrlSchema, optionalTrimmedString, requiredTrimmedString } from './common.js';

export const indexDocumentInputSchema = z.object({
  url: normalizedUrlSchema,
  type: z.enum(documentTypeValues),
  title: optionalTrimmedString(inputLimits.title, 'Document title'),
  body: requiredTrimmedString(inputLimits.body, 'Document body'),
  summary: optionalTrimmedString(inputLimits.summary, 'Summary'),
  purpose: optionalTrimmedString(inputLimits.purpose, 'Purpose')
});

export function parseIndexDocumentInput(input: unknown): IndexDocumentInput {
  return indexDocumentInputSchema.parse(input);
}

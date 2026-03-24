import { z } from 'zod';

import type { ChatInput } from '../types/domain.js';
import { inputLimits, optionalTrimmedString, requiredTrimmedString } from './common.js';

export const rawChatMessageCitationSchema = z
  .object({
    trackingToken: z.string().optional(),
    sourceDocument: z.unknown().optional(),
    sourceFile: z.unknown().optional(),
    sourcePerson: z.unknown().optional(),
    referenceRanges: z.array(z.unknown()).optional()
  })
  .passthrough();

export const rawChatMessageFragmentSchema = z
  .object({
    text: z.string().optional(),
    querySuggestion: z.unknown().optional(),
    file: z.unknown().optional(),
    action: z.unknown().optional(),
    citation: rawChatMessageCitationSchema.optional()
  })
  .passthrough();

export const rawChatMessageSchema = z
  .object({
    agentConfig: z.unknown().optional(),
    author: z.string().optional(),
    citations: z.array(rawChatMessageCitationSchema).optional(),
    uploadedFileIds: z.array(z.string()).optional(),
    fragments: z.array(rawChatMessageFragmentSchema).optional(),
    ts: z.string().optional(),
    messageId: z.string().optional(),
    messageTrackingToken: z.string().optional(),
    messageType: z.string().optional(),
    hasMoreFragments: z.boolean().optional()
  })
  .passthrough();

export const chatInputSchema = z.object({
  newMessage: requiredTrimmedString(inputLimits.message, 'Message'),
  rawMessages: z.array(rawChatMessageSchema).default([]),
  trackingToken: optionalTrimmedString(inputLimits.trackingToken, 'Tracking token')
});

export function parseChatInput(input: unknown): ChatInput {
  return chatInputSchema.parse(input) as ChatInput;
}

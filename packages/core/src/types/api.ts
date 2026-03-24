import type { ChatInput, ParsedMessage, SourceRef, VerificationResult } from './domain.js';

export const resultStatusValues = ['SUCCESS', 'ERROR'] as const;
export type ResultStatus = (typeof resultStatusValues)[number];

export interface ApiErrorResult {
  status: 'ERROR';
  statusReason: string;
}

export interface IndexDocumentSuccessResult {
  status: 'SUCCESS';
  documentId: string;
  verification: VerificationResult;
}

export type IndexDocumentResult = IndexDocumentSuccessResult | ApiErrorResult;

export interface ChatSuccessResult {
  status: 'SUCCESS';
  answer: string;
  parsedMessages: ParsedMessage[];
  sources: SourceRef[];
  trackingToken?: string | undefined;
  followUpPrompts?: string[] | undefined;
}

export type ChatResult = ChatSuccessResult | ApiErrorResult;

export type ChatApiRequest = ChatInput;

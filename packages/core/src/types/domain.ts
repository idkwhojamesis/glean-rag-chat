import type {
  GleanChatMessage,
  GleanChatMessageCitation,
  GleanChatMessageFragment,
  GleanRawChatAuthor,
  GleanRawChatMessageType
} from './vendor.js';

export const documentTypeValues = ['Letter', 'Documentation'] as const;
export type DocumentType = (typeof documentTypeValues)[number];

export const parsedMessageRoleValues = ['USER', 'ASSISTANT'] as const;
export type ParsedMessageRole = (typeof parsedMessageRoleValues)[number];

export const verificationDebugStatusValues = [
  'NOT_FOUND',
  'UPLOADED',
  'INDEXED',
  'FAILED',
  'UNKNOWN'
] as const;
export type VerificationDebugStatus = (typeof verificationDebugStatusValues)[number];

export interface SourceRef {
  documentId: string;
  title: string;
  url: string;
  snippets?: string[] | undefined;
}

export interface ParsedMessage {
  role: ParsedMessageRole;
  content: string;
  sources?: SourceRef[] | undefined;
}

export type RawChatAuthor = GleanRawChatAuthor;
export type RawChatMessageType = GleanRawChatMessageType;
export type RawChatMessageCitation = GleanChatMessageCitation;
export type RawChatMessageFragment = GleanChatMessageFragment;
export type RawChatMessage = GleanChatMessage;

export interface IndexDocumentInput {
  url: string;
  type: DocumentType;
  title?: string | undefined;
  body: string;
  summary?: string | undefined;
  purpose?: string | undefined;
}

export interface VerificationResult {
  debugStatus: VerificationDebugStatus;
  accessCheck: boolean;
  searchCheck: boolean;
}

export interface ChatInput {
  newMessage: string;
  rawMessages: RawChatMessage[];
  trackingToken?: string | undefined;
}

import type { ChatInput } from '../types/domain.js';
import {
  GleanChatAuthor,
  GleanChatMessageType,
  type GleanChatMessage,
  type GleanChatRequest,
  type GleanDocumentSpec
} from '../types/vendor.js';

export const DEFAULT_GROUNDED_CONTEXT_MESSAGE =
  'Answer using only the provided datasource documents. If the documents do not support the answer, say that directly.';

export type ChatHistoryOrder = 'chronological' | 'most-recent-first';

export interface MapChatInputToChatRequestOptions {
  documentSpecs?: GleanDocumentSpec[];
  contextMessage?: string;
  historyOrder?: ChatHistoryOrder;
  saveChat?: boolean;
  chatId?: string;
  timeoutMillis?: number;
  applicationId?: string;
  agentId?: string;
}

export function createUserChatMessage(text: string): GleanChatMessage {
  return {
    author: GleanChatAuthor.User,
    messageType: GleanChatMessageType.Content,
    fragments: [{ text }]
  };
}

export function createContextChatMessage(text: string): GleanChatMessage {
  return {
    author: GleanChatAuthor.User,
    messageType: GleanChatMessageType.Context,
    fragments: [{ text }]
  };
}

export function normalizeRawChatMessagesForRequest(
  rawMessages: readonly GleanChatMessage[],
  historyOrder: ChatHistoryOrder = 'chronological'
): GleanChatMessage[] {
  return historyOrder === 'chronological' ? [...rawMessages].reverse() : [...rawMessages];
}

export function mapChatInputToChatRequest(
  input: ChatInput,
  options: MapChatInputToChatRequestOptions = {}
): GleanChatRequest {
  const messages: GleanChatMessage[] = [
    createUserChatMessage(input.newMessage),
    createContextChatMessage(options.contextMessage ?? DEFAULT_GROUNDED_CONTEXT_MESSAGE),
    ...normalizeRawChatMessagesForRequest(input.rawMessages, options.historyOrder)
  ];

  return {
    messages,
    ...(options.documentSpecs === undefined || options.documentSpecs.length === 0
      ? {}
      : {
          inclusions: {
            documentSpecs: options.documentSpecs
          }
        }),
    ...(options.saveChat === undefined ? {} : { saveChat: options.saveChat }),
    ...(options.chatId === undefined ? {} : { chatId: options.chatId }),
    ...(options.timeoutMillis === undefined ? {} : { timeoutMillis: options.timeoutMillis }),
    ...(options.applicationId === undefined ? {} : { applicationId: options.applicationId }),
    ...(options.agentId === undefined ? {} : { agentId: options.agentId })
  };
}

import { Glean, HTTPClient } from '@gleanwork/api-client';
import type { Fetcher, HTTPClientOptions } from '@gleanwork/api-client';
import {
  Author,
  MessageType,
  RelationType,
  ResponseHint
} from '@gleanwork/api-client/models/components';
import type {
  ChatMessage,
  ChatMessageCitation,
  ChatMessageFragment,
  ChatRequest,
  ChatResponse,
  CheckDocumentAccessRequest,
  CheckDocumentAccessResponse,
  ContentDefinition,
  CustomProperty,
  DebugDocumentRequest,
  DebugDocumentResponse,
  DocumentDefinition,
  DocumentPermissionsDefinition,
  DocumentSpecUnion,
  DocumentStatusResponse,
  FacetFilter,
  FacetFilterValue,
  GetDocumentStatusRequest,
  GetDocumentStatusResponse,
  IndexDocumentRequest,
  SearchRequest,
  SearchRequestOptions,
  SearchResponse,
  SearchResult,
  SearchResultSnippet
} from '@gleanwork/api-client/models/components';

export { Glean, HTTPClient };
export type { Fetcher, HTTPClientOptions };
export {
  Author as GleanChatAuthor,
  MessageType as GleanChatMessageType,
  RelationType as GleanRelationType,
  ResponseHint as GleanResponseHint
};

export type GleanChatMessage = ChatMessage;
export type GleanChatMessageCitation = ChatMessageCitation;
export type GleanChatMessageFragment = ChatMessageFragment;
export type GleanChatRequest = ChatRequest;
export type GleanChatResponse = ChatResponse;
export type GleanCheckDocumentAccessRequest = CheckDocumentAccessRequest;
export type GleanCheckDocumentAccessResponse = CheckDocumentAccessResponse;
export type GleanContentDefinition = ContentDefinition;
export type GleanCustomProperty = CustomProperty;
export type GleanDebugDocumentRequest = DebugDocumentRequest;
export type GleanDebugDocumentResponse = DebugDocumentResponse;
export type GleanGetDocumentStatusRequest = GetDocumentStatusRequest;
export type GleanGetDocumentStatusResponse = GetDocumentStatusResponse;
export type GleanDocumentDefinition = DocumentDefinition;
export type GleanDocumentPermissionsDefinition = DocumentPermissionsDefinition;
export type GleanDocumentSpec = DocumentSpecUnion;
export type GleanDocumentStatusResponse = DocumentStatusResponse;
export type GleanFacetFilter = FacetFilter;
export type GleanFacetFilterValue = FacetFilterValue;
export type GleanIndexDocumentRequest = IndexDocumentRequest;
export type GleanSearchRequest = SearchRequest;
export type GleanSearchRequestOptions = SearchRequestOptions;
export type GleanSearchResponse = SearchResponse;
export type GleanSearchResult = SearchResult;
export type GleanSearchResultSnippet = SearchResultSnippet;
export type GleanRawChatAuthor = Author;
export type GleanRawChatMessageType = MessageType;

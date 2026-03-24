export { envSchema, loadEnv, parseEnv } from './config/env.js';
export type { AppEnv, LoadEnvOptions } from './config/env.js';
export type {
  ChatInput,
  DocumentType,
  IndexDocumentInput,
  ParsedMessage,
  ParsedMessageRole,
  RawChatAuthor,
  RawChatMessage,
  RawChatMessageCitation,
  RawChatMessageFragment,
  RawChatMessageType,
  SourceRef,
  VerificationDebugStatus,
  VerificationResult
} from './types/domain.js';
export { documentTypeValues, parsedMessageRoleValues, verificationDebugStatusValues } from './types/domain.js';
export {
  Glean,
  GleanChatAuthor,
  GleanChatMessageType,
  GleanRelationType,
  GleanResponseHint,
  HTTPClient
} from './types/vendor.js';
export type {
  Fetcher,
  GleanChatRequest,
  GleanChatResponse,
  GleanCheckDocumentAccessRequest,
  GleanCheckDocumentAccessResponse,
  GleanContentDefinition,
  GleanCustomProperty,
  GleanDebugDocumentRequest,
  GleanDebugDocumentResponse,
  GleanDocumentDefinition,
  GleanDocumentPermissionsDefinition,
  GleanDocumentSpec,
  GleanDocumentStatusResponse,
  GleanFacetFilter,
  GleanFacetFilterValue,
  GleanIndexDocumentRequest,
  GleanRawChatAuthor,
  GleanRawChatMessageType,
  GleanSearchRequest,
  GleanSearchRequestOptions,
  GleanSearchResponse,
  GleanSearchResult,
  GleanSearchResultSnippet,
  HTTPClientOptions
} from './types/vendor.js';
export type {
  ApiErrorResult,
  ChatApiRequest,
  ChatResult,
  ChatSuccessResult,
  IndexDocumentResult,
  IndexDocumentSuccessResult,
  ResultStatus
} from './types/api.js';
export { resultStatusValues } from './types/api.js';
export {
  DEFAULT_DOCUMENT_PERMISSIONS,
  createPlainTextContentDefinition,
  mapIndexDocumentInputToDocumentDefinition,
  mapIndexDocumentInputToIndexDocumentRequest,
  PURPOSE_CUSTOM_PROPERTY_NAME
} from './mappers/index-payload.js';
export {
  buildDocumentSpecsFromSearchResults,
  DEFAULT_SEARCH_FACET_BUCKET_SIZE,
  DEFAULT_SEARCH_MAX_SNIPPET_SIZE,
  DEFAULT_SEARCH_PAGE_SIZE,
  mapChatInputToSearchRequest,
  mapSearchResultsToSourceRefs
} from './mappers/search-payload.js';
export {
  createContextChatMessage,
  createUserChatMessage,
  DEFAULT_GROUNDED_CONTEXT_MESSAGE,
  mapChatInputToChatRequest,
  normalizeRawChatMessagesForRequest
} from './mappers/chat-payload.js';
export {
  extractSourceRefsFromChatMessage,
  mapChatMessageToParsedMessage,
  mapChatResponseToChatResult,
  mapIndexingDebugStatusToVerificationStatus,
  mapSearchResultsToChatFallbackSources
} from './mappers/chat-response.js';
export {
  chatInputSchema,
  parseChatInput,
  rawChatMessageCitationSchema,
  rawChatMessageFragmentSchema,
  rawChatMessageSchema
} from './validation/chat-request.js';
export { indexDocumentInputSchema, parseIndexDocumentInput } from './validation/index-request.js';
export { inputLimits } from './validation/common.js';
export { createIndexDocumentService } from './services/index-document-service.js';
export {
  AppError,
  ConflictError,
  ExternalServiceError,
  InputValidationError,
  TimeoutError,
  isAppError,
  toErrorMessage
} from './utils/errors.js';
export { createDocumentId, slugifyDocumentSegment } from './utils/id.js';
export { createLogger, logger } from './utils/logging.js';
export { computeRetryDelay, retry, waitForDelay, withTimeout } from './utils/retry.js';
export {
  createGleanChatClient,
  createGleanIndexingClient,
  createGleanSearchClient
} from './clients/index.js';
export type { AppErrorDetails, AppErrorOptions } from './utils/errors.js';
export type { ChatHistoryOrder, MapChatInputToChatRequestOptions } from './mappers/chat-payload.js';
export type { MapChatResponseToResultOptions } from './mappers/chat-response.js';
export type { MapIndexDocumentInputOptions } from './mappers/index-payload.js';
export type { MapChatInputToSearchRequestOptions } from './mappers/search-payload.js';
export type {
  CreateIndexDocumentServiceOptions,
  IndexDocumentService
} from './services/index-document-service.js';
export type {
  CreateGleanChatClientOptions,
  GleanChatClient
} from './clients/glean-chat-client.js';
export type {
  CreateGleanIndexingClientOptions,
  GleanIndexingClient
} from './clients/glean-indexing-client.js';
export type {
  CreateGleanSearchClientOptions,
  GleanSearchClient
} from './clients/glean-search-client.js';
export type { CreateDocumentIdOptions } from './utils/id.js';
export type { CreateLoggerOptions } from './utils/logging.js';
export type { RetryContext, RetryOptions, WithTimeoutOptions } from './utils/retry.js';

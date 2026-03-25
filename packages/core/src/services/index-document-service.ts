import type { Logger } from 'pino';
import { ZodError } from 'zod';

import type { AppEnv } from '../config/env.js';
import { createGleanIndexingClient } from '../clients/glean-indexing-client.js';
import { createGleanSearchClient } from '../clients/glean-search-client.js';
import { mapIndexingDebugStatusToVerificationStatus } from '../mappers/chat-response.js';
import { mapIndexDocumentInputToIndexDocumentRequest } from '../mappers/index-payload.js';
import { mapChatInputToSearchRequest } from '../mappers/search-payload.js';
import type { IndexDocumentSuccessResult } from '../types/api.js';
import type { IndexDocumentInput, VerificationResult } from '../types/domain.js';
import { ConflictError, ExternalServiceError, InputValidationError, TimeoutError } from '../utils/errors.js';
import { createDocumentId } from '../utils/id.js';
import { logger as defaultLogger } from '../utils/logging.js';
import { waitForDelay as defaultWaitForDelay } from '../utils/retry.js';
import { parseIndexDocumentInput } from '../validation/index-request.js';
import type { GleanIndexingClient } from '../clients/glean-indexing-client.js';
import type { GleanSearchClient } from '../clients/glean-search-client.js';
import type { VerificationDebugStatus } from '../types/domain.js';
import type { GleanSearchResult } from '../types/vendor.js';

const DEFAULT_MAX_ID_ATTEMPTS = 5;
const DEFAULT_DEBUG_POLL_ATTEMPTS = 12;
const DEFAULT_DEBUG_POLL_DELAY_MS = 5000;
const DEFAULT_SEARCH_POLL_ATTEMPTS = 6;
const DEFAULT_SEARCH_POLL_DELAY_MS = 5000;

type IndexServiceEnv = Pick<
  AppEnv,
  | 'GLEAN_ACCESS_CHECK_USER_EMAIL'
  | 'GLEAN_CLIENT_API_TOKEN'
  | 'GLEAN_DATASOURCE'
  | 'GLEAN_INDEXING_API_TOKEN'
  | 'GLEAN_INSTANCE'
>;

export interface CreateIndexDocumentServiceOptions {
  env: IndexServiceEnv;
  indexingClient?: GleanIndexingClient;
  searchClient?: GleanSearchClient;
  logger?: Logger;
  now?: () => Date;
  waitForDelay?: typeof defaultWaitForDelay;
  maxIdAttempts?: number;
  debugPollAttempts?: number;
  debugPollDelayMs?: number;
  searchPollAttempts?: number;
  searchPollDelayMs?: number;
}

export interface IndexDocumentService {
  indexDocument(input: unknown): Promise<IndexDocumentSuccessResult>;
}

interface DocumentStatusSnapshot {
  uploadStatus: string | undefined;
  indexingStatus: string | undefined;
}

function buildVerification(
  debugStatus: VerificationDebugStatus,
  accessCheck: boolean,
  searchCheck: boolean
): VerificationResult {
  return {
    debugStatus,
    accessCheck,
    searchCheck
  };
}

function extractDocumentIdFromSearchResult(result: GleanSearchResult) {
  return result.document?.id ?? result.document?.metadata?.documentId;
}

function collectSearchResultDocumentIds(results: readonly GleanSearchResult[]) {
  return results
    .map(extractDocumentIdFromSearchResult)
    .filter((documentId): documentId is string => documentId !== undefined);
}

function normalizeComparableUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    parsedUrl.hash = '';

    if (parsedUrl.pathname.length > 1) {
      parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '');
    }

    return parsedUrl.toString();
  } catch {
    return url.replace(/\/+$/, '');
  }
}

function buildCustomDatasourceDocumentId(
  datasource: string,
  objectType: IndexDocumentInput['type'],
  documentId: string
) {
  return `CUSTOM_${datasource.toUpperCase()}_${objectType}_${documentId}`;
}

function searchResultMatchesIndexedDocument(
  result: GleanSearchResult,
  input: IndexDocumentInput,
  datasource: string,
  documentId: string
) {
  const indexedUrl = normalizeComparableUrl(input.url);
  const resultUrl = result.document?.url ?? result.url;

  if (resultUrl !== undefined && normalizeComparableUrl(resultUrl) === indexedUrl) {
    return true;
  }

  const resultDocumentId = extractDocumentIdFromSearchResult(result);

  if (resultDocumentId === undefined) {
    return false;
  }

  return (
    resultDocumentId === documentId ||
    resultDocumentId === buildCustomDatasourceDocumentId(datasource, input.type, documentId) ||
    resultDocumentId.endsWith(`_${documentId}`)
  );
}

function isDocumentIdAvailable(
  uploadStatus: string | undefined,
  indexingStatus: string | undefined
) {
  if (uploadStatus === undefined && indexingStatus === undefined) {
    return true;
  }

  if (uploadStatus === 'STATUS_UNKNOWN' && indexingStatus === 'STATUS_UNKNOWN') {
    return true;
  }

  return mapIndexingDebugStatusToVerificationStatus(uploadStatus, indexingStatus) === 'NOT_FOUND';
}

function formatStatusValue(status: string | undefined) {
  return status ?? 'STATUS_UNKNOWN';
}

export function createIndexDocumentService(options: CreateIndexDocumentServiceOptions): IndexDocumentService {
  const indexingClient =
    options.indexingClient ??
    createGleanIndexingClient({
      env: options.env,
      ...(options.logger === undefined ? {} : { logger: options.logger })
    });
  const searchClient =
    options.searchClient ??
    createGleanSearchClient({
      env: options.env,
      ...(options.logger === undefined ? {} : { logger: options.logger })
    });
  const logger = options.logger ?? defaultLogger;
  const now = options.now ?? (() => new Date());
  const waitForDelay = options.waitForDelay ?? defaultWaitForDelay;
  const maxIdAttempts = options.maxIdAttempts ?? DEFAULT_MAX_ID_ATTEMPTS;
  const debugPollAttempts = options.debugPollAttempts ?? DEFAULT_DEBUG_POLL_ATTEMPTS;
  const debugPollDelayMs = options.debugPollDelayMs ?? DEFAULT_DEBUG_POLL_DELAY_MS;
  const searchPollAttempts = options.searchPollAttempts ?? DEFAULT_SEARCH_POLL_ATTEMPTS;
  const searchPollDelayMs = options.searchPollDelayMs ?? DEFAULT_SEARCH_POLL_DELAY_MS;

  async function getDocumentStatusSnapshot(
    input: IndexDocumentInput,
    documentId: string
  ): Promise<DocumentStatusSnapshot> {
    try {
      const response = await indexingClient.debugDocument({
        objectType: input.type,
        docId: documentId
      });

      return {
        uploadStatus: response.status?.uploadStatus,
        indexingStatus: response.status?.indexingStatus
      };
    } catch (debugError) {
      logger.warn(
        {
          datasource: options.env.GLEAN_DATASOURCE,
          documentId,
          objectType: input.type,
          error: debugError
        },
        'Debug document request failed, falling back to deprecated status endpoint'
      );

      try {
        const response = await indexingClient.getDocumentStatus({
          datasource: options.env.GLEAN_DATASOURCE,
          objectType: input.type,
          docId: documentId
        });

        return {
          uploadStatus: response.uploadStatus,
          indexingStatus: response.indexingStatus
        };
      } catch (statusError) {
        throw new ExternalServiceError('Failed to check document indexing status', { documentId }, statusError);
      }
    }
  }

  async function createUniqueDocumentId(input: IndexDocumentInput) {
    const baseTimestamp = now();

    for (let attempt = 0; attempt < maxIdAttempts; attempt += 1) {
      const candidateDocumentId = createDocumentId(input, {
        timestamp: new Date(baseTimestamp.getTime() + attempt)
      });
      const statusSnapshot = await getDocumentStatusSnapshot(input, candidateDocumentId);

      if (isDocumentIdAvailable(statusSnapshot.uploadStatus, statusSnapshot.indexingStatus)) {
        return candidateDocumentId;
      }

      logger.debug(
        {
          attempt: attempt + 1,
          candidateDocumentId,
          indexingStatus: statusSnapshot.indexingStatus,
          uploadStatus: statusSnapshot.uploadStatus
        },
        'Generated document ID already exists, retrying'
      );
    }

    throw new ConflictError('Unable to generate a unique document ID', { maxIdAttempts });
  }

  async function pollForIndexedStatus(input: IndexDocumentInput, documentId: string) {
    let lastDebugStatus: VerificationDebugStatus = 'UNKNOWN';
    let lastStatusSnapshot: DocumentStatusSnapshot = {
      uploadStatus: undefined,
      indexingStatus: undefined
    };

    for (let attempt = 1; attempt <= debugPollAttempts; attempt += 1) {
      const statusSnapshot = await getDocumentStatusSnapshot(input, documentId);
      const debugStatus = mapIndexingDebugStatusToVerificationStatus(
        statusSnapshot.uploadStatus,
        statusSnapshot.indexingStatus
      );

      lastDebugStatus = debugStatus;
      lastStatusSnapshot = statusSnapshot;

      if (debugStatus === 'INDEXED') {
        return debugStatus;
      }

      if (debugStatus === 'FAILED') {
        throw new ExternalServiceError('Document failed indexing in Glean', {
          documentId,
          verification: buildVerification(debugStatus, false, false)
        });
      }

      if (attempt < debugPollAttempts) {
        logger.debug(
          {
            attempt,
            documentId,
            debugStatus,
            nextDelayMs: debugPollDelayMs
          },
          'Document not indexed yet, waiting before next debug poll'
        );

        await waitForDelay(debugPollDelayMs);
      }
    }

    throw new TimeoutError(
      `Document indexing timed out before reaching INDEXED status. Last observed status: upload=${formatStatusValue(lastStatusSnapshot.uploadStatus)}, indexing=${formatStatusValue(lastStatusSnapshot.indexingStatus)}.`,
      {
        documentId,
        uploadStatus: lastStatusSnapshot.uploadStatus,
        indexingStatus: lastStatusSnapshot.indexingStatus,
        waitMs: debugPollDelayMs * Math.max(debugPollAttempts - 1, 0),
        verification: buildVerification(lastDebugStatus, false, false)
      }
    );
  }

  async function verifySearchDiscoverability(
    input: IndexDocumentInput,
    documentId: string,
    debugStatus: VerificationDebugStatus
  ) {
    let lastObservedDocumentIds: string[] = [];

    for (let attempt = 1; attempt <= searchPollAttempts; attempt += 1) {
      try {
        const searchResponse = await searchClient.search(
          mapChatInputToSearchRequest(
            {
              newMessage: documentId
            },
            {
              datasource: options.env.GLEAN_DATASOURCE
            }
          )
        );
        const resultDocumentIds = collectSearchResultDocumentIds(searchResponse.results ?? []);

        lastObservedDocumentIds = resultDocumentIds;

        if (
          (searchResponse.results ?? []).some((result) =>
            searchResultMatchesIndexedDocument(result, input, options.env.GLEAN_DATASOURCE, documentId)
          )
        ) {
          return true;
        }

        if (attempt < searchPollAttempts) {
          logger.debug(
            {
              attempt,
              documentId,
              observedDocumentIds: resultDocumentIds,
              nextDelayMs: searchPollDelayMs
            },
            'Indexed document not discoverable through search yet, waiting before retry'
          );

          await waitForDelay(searchPollDelayMs);
        }
      } catch (error) {
        throw new ExternalServiceError(
          'Failed to verify document discoverability through search',
          {
            documentId,
            verification: buildVerification(debugStatus, true, false)
          },
          error
        );
      }
    }

    throw new ExternalServiceError(
      `Indexed document is not discoverable through search yet. Last observed search result IDs: ${
        lastObservedDocumentIds.length === 0 ? 'none' : lastObservedDocumentIds.join(', ')
      }.`,
      {
        documentId,
        observedDocumentIds: lastObservedDocumentIds,
        verification: buildVerification(debugStatus, true, false)
      }
    );
  }

  return {
    async indexDocument(input: unknown): Promise<IndexDocumentSuccessResult> {
      let parsedInput: IndexDocumentInput;

      try {
        parsedInput = parseIndexDocumentInput(input);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new InputValidationError('Request validation failed', { issues: error.issues }, error);
        }

        throw error;
      }

      const documentId = await createUniqueDocumentId(parsedInput);
      const indexRequest = mapIndexDocumentInputToIndexDocumentRequest(parsedInput, {
        datasource: options.env.GLEAN_DATASOURCE,
        documentId
      });

      try {
        await indexingClient.indexDocument(indexRequest);
      } catch (error) {
        throw new ExternalServiceError('Failed to index document in Glean', { documentId }, error);
      }

      const debugStatus = await pollForIndexedStatus(parsedInput, documentId);

      let accessCheck = false;

      try {
        const accessResponse = await indexingClient.checkDocumentAccess({
          datasource: options.env.GLEAN_DATASOURCE,
          objectType: parsedInput.type,
          docId: documentId,
          userEmail: options.env.GLEAN_ACCESS_CHECK_USER_EMAIL
        });

        accessCheck = accessResponse.hasAccess === true;
      } catch (error) {
        throw new ExternalServiceError('Failed to verify document access in Glean', {
          documentId,
          verification: buildVerification(debugStatus, false, false)
        }, error);
      }

      if (!accessCheck) {
        throw new ExternalServiceError('Indexed document failed access verification', {
          documentId,
          verification: buildVerification(debugStatus, false, false)
        });
      }

      const searchCheck = await verifySearchDiscoverability(parsedInput, documentId, debugStatus);

      return {
        status: 'SUCCESS',
        documentId,
        verification: buildVerification(debugStatus, accessCheck, searchCheck)
      };
    }
  };
}

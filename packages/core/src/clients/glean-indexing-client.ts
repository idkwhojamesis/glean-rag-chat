import type { Logger } from 'pino';

import type { AppEnv } from '../config/env.js';
import type {
  GleanCheckDocumentAccessRequest,
  GleanCheckDocumentAccessResponse,
  GleanDebugDocumentRequest,
  GleanDebugDocumentResponse,
  GleanIndexDocumentRequest,
  HTTPClient
} from '../types/vendor.js';
import { createIndexingNamespaceSdk } from './sdk.js';

export interface CreateGleanIndexingClientOptions {
  env: Pick<AppEnv, 'GLEAN_DATASOURCE' | 'GLEAN_INDEXING_API_TOKEN' | 'GLEAN_INSTANCE'>;
  httpClient?: HTTPClient;
  logger?: Logger;
}

export interface GleanIndexingClient {
  indexDocument(request: GleanIndexDocumentRequest): Promise<void>;
  debugDocument(request: GleanDebugDocumentRequest): Promise<GleanDebugDocumentResponse>;
  checkDocumentAccess(request: GleanCheckDocumentAccessRequest): Promise<GleanCheckDocumentAccessResponse>;
}

export function createGleanIndexingClient(options: CreateGleanIndexingClientOptions): GleanIndexingClient {
  const sdk = createIndexingNamespaceSdk({
    env: {
      ...options.env,
      GLEAN_CLIENT_API_TOKEN: ''
    },
    httpClient: options.httpClient,
    logger: options.logger
  });

  return {
    async indexDocument(request) {
      await sdk.indexing.documents.addOrUpdate(request);

      options.logger?.debug(
        {
          datasource: request.document.datasource,
          documentId: request.document.id,
          objectType: request.document.objectType
        },
        'Glean document indexed'
      );
    },

    async debugDocument(request) {
      const response = await sdk.indexing.documents.debug(request, options.env.GLEAN_DATASOURCE);

      options.logger?.debug(
        {
          datasource: options.env.GLEAN_DATASOURCE,
          documentId: request.docId,
          indexingStatus: response.status?.indexingStatus,
          uploadStatus: response.status?.uploadStatus
        },
        'Glean document debug completed'
      );

      return response;
    },

    async checkDocumentAccess(request) {
      const response = await sdk.indexing.documents.checkAccess(request);

      options.logger?.debug(
        {
          datasource: request.datasource,
          documentId: request.docId,
          hasAccess: response.hasAccess
        },
        'Glean document access check completed'
      );

      return response;
    }
  };
}

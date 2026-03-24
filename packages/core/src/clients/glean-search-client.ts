import type { Logger } from 'pino';

import type { AppEnv } from '../config/env.js';
import type { GleanSearchRequest, GleanSearchResponse, HTTPClient } from '../types/vendor.js';
import { createClientNamespaceSdk } from './sdk.js';

export interface CreateGleanSearchClientOptions {
  env: Pick<AppEnv, 'GLEAN_CLIENT_API_TOKEN' | 'GLEAN_INSTANCE'>;
  httpClient?: HTTPClient;
  logger?: Logger;
}

export interface GleanSearchClient {
  search(request: GleanSearchRequest): Promise<GleanSearchResponse>;
}

export function createGleanSearchClient(options: CreateGleanSearchClientOptions): GleanSearchClient {
  const sdk = createClientNamespaceSdk({
    env: {
      ...options.env,
      GLEAN_INDEXING_API_TOKEN: ''
    },
    httpClient: options.httpClient,
    logger: options.logger
  });

  return {
    async search(request) {
      const response = await sdk.client.search.query(request);

      options.logger?.debug(
        {
          query: request.query,
          requestId: response.requestID,
          resultCount: response.results?.length ?? 0,
          trackingToken: response.trackingToken
        },
        'Glean search completed'
      );

      return response;
    }
  };
}

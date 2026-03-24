import type { Logger } from 'pino';

import type { AppEnv } from '../config/env.js';
import type { GleanChatRequest, GleanChatResponse, HTTPClient } from '../types/vendor.js';
import { createClientNamespaceSdk } from './sdk.js';

export interface CreateGleanChatClientOptions {
  env: Pick<AppEnv, 'GLEAN_CLIENT_API_TOKEN' | 'GLEAN_INSTANCE'>;
  httpClient?: HTTPClient;
  logger?: Logger;
}

export interface GleanChatClient {
  chat(request: GleanChatRequest): Promise<GleanChatResponse>;
}

export function createGleanChatClient(options: CreateGleanChatClientOptions): GleanChatClient {
  const sdk = createClientNamespaceSdk({
    env: {
      ...options.env,
      GLEAN_INDEXING_API_TOKEN: ''
    },
    httpClient: options.httpClient,
    logger: options.logger
  });

  return {
    async chat(request) {
      const response = await sdk.client.chat.create(request);

      options.logger?.debug(
        {
          chatId: response.chatId,
          messageCount: response.messages?.length ?? 0,
          trackingToken: response.chatSessionTrackingToken
        },
        'Glean chat completed'
      );

      return response;
    }
  };
}

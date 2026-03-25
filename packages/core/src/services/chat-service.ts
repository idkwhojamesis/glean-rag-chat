import type { Logger } from 'pino';
import { ZodError } from 'zod';

import type { AppEnv } from '../config/env.js';
import { createGleanChatClient } from '../clients/glean-chat-client.js';
import { createGleanSearchClient } from '../clients/glean-search-client.js';
import { mapChatInputToChatRequest } from '../mappers/chat-payload.js';
import { mapChatResponseToChatResult, mapSearchResultsToChatFallbackSources } from '../mappers/chat-response.js';
import { buildDocumentSpecsFromSearchResults, mapChatInputToSearchRequest } from '../mappers/search-payload.js';
import type { ChatSuccessResult } from '../types/api.js';
import type { ChatInput } from '../types/domain.js';
import { ExternalServiceError, InputValidationError } from '../utils/errors.js';
import { logger as defaultLogger } from '../utils/logging.js';
import { parseChatInput } from '../validation/chat-request.js';
import type { GleanChatClient } from '../clients/glean-chat-client.js';
import type { GleanSearchClient } from '../clients/glean-search-client.js';

type ChatServiceEnv = Pick<AppEnv, 'GLEAN_CLIENT_API_TOKEN' | 'GLEAN_DATASOURCE' | 'GLEAN_INSTANCE'>;

export interface CreateChatServiceOptions {
  env: ChatServiceEnv;
  searchClient?: GleanSearchClient;
  chatClient?: GleanChatClient;
  logger?: Logger;
}

export interface ChatService {
  chat(input: unknown): Promise<ChatSuccessResult>;
}

export function createChatService(options: CreateChatServiceOptions): ChatService {
  const searchClient =
    options.searchClient ??
    createGleanSearchClient({
      env: options.env,
      ...(options.logger === undefined ? {} : { logger: options.logger })
    });
  const chatClient =
    options.chatClient ??
    createGleanChatClient({
      env: options.env,
      ...(options.logger === undefined ? {} : { logger: options.logger })
    });
  const logger = options.logger ?? defaultLogger;

  return {
    async chat(input: unknown): Promise<ChatSuccessResult> {
      let parsedInput: ChatInput;

      try {
        parsedInput = parseChatInput(input);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new InputValidationError('Request validation failed', { issues: error.issues }, error);
        }

        throw error;
      }

      let searchResponse;

      try {
        searchResponse = await searchClient.search(
          mapChatInputToSearchRequest(parsedInput, {
            datasource: options.env.GLEAN_DATASOURCE
          })
        );
      } catch (error) {
        throw new ExternalServiceError('Failed to search Glean for relevant documents', {
          datasource: options.env.GLEAN_DATASOURCE
        }, error);
      }

      const searchResults = searchResponse.results ?? [];
      const documentSpecs = buildDocumentSpecsFromSearchResults(searchResults);
      const fallbackSources = mapSearchResultsToChatFallbackSources(searchResults);

      logger.debug(
        {
          datasource: options.env.GLEAN_DATASOURCE,
          documentSpecCount: documentSpecs.length,
          resultCount: searchResults.length
        },
        'Prepared chat request from search results'
      );

      let chatResponse;

      try {
        chatResponse = await chatClient.chat(
          mapChatInputToChatRequest(parsedInput, {
            documentSpecs
          })
        );
      } catch (error) {
        throw new ExternalServiceError('Failed to generate grounded chat response from Glean', {
          datasource: options.env.GLEAN_DATASOURCE,
          documentSpecCount: documentSpecs.length
        }, error);
      }

      return mapChatResponseToChatResult(chatResponse, {
        fallbackSources,
        ...(searchResponse.trackingToken === undefined
          ? {}
          : { fallbackTrackingToken: searchResponse.trackingToken })
      });
    }
  };
}

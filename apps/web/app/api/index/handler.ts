import {
  createLogger,
  createIndexDocumentService,
  isAppError,
  loadEnv,
  type IndexDocumentService,
  type IndexDocumentSuccessResult
} from '@glean-rag-chat/core';
import { NextResponse } from 'next/server';

import { readJsonRequestBody } from '../request.js';

type IndexRouteService = Pick<IndexDocumentService, 'indexDocument'>;

export interface CreateIndexRouteHandlerOptions {
  service?: IndexRouteService;
}

function getDefaultService() {
  const env = loadEnv({ cwd: process.cwd() });

  return createIndexDocumentService({
    env,
    logger: createLogger({
      level: env.LOG_LEVEL,
      name: 'glean-rag-chat-web'
    })
  });
}

export function createIndexRouteHandler(options: CreateIndexRouteHandlerOptions = {}) {
  return async function POST(request: Request) {
    try {
      const body = await readJsonRequestBody(request);
      const service = options.service ?? getDefaultService();
      const result = (await service.indexDocument(body)) satisfies IndexDocumentSuccessResult;

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      if (isAppError(error)) {
        return NextResponse.json(
          {
            status: 'ERROR',
            statusReason: error.message
          },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        {
          status: 'ERROR',
          statusReason: 'Unexpected error while indexing document.'
        },
        { status: 500 }
      );
    }
  };
}

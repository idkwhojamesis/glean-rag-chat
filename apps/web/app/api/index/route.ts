import {
  createIndexDocumentService,
  isAppError,
  loadEnv,
  type IndexDocumentService,
  type IndexDocumentSuccessResult
} from '@glean-rag-chat/core';
import { NextResponse } from 'next/server';

type IndexRouteService = Pick<IndexDocumentService, 'indexDocument'>;

export interface CreateIndexRouteHandlerOptions {
  service?: IndexRouteService;
}

function getDefaultService() {
  return createIndexDocumentService({
    env: loadEnv({ cwd: process.cwd() })
  });
}

export function createIndexRouteHandler(options: CreateIndexRouteHandlerOptions = {}) {
  return async function POST(request: Request) {
    try {
      const body = await request.json();
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

export const POST = createIndexRouteHandler();

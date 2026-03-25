import {
  createLogger,
  createChatService,
  isAppError,
  loadEnv,
  type ChatService,
  type ChatSuccessResult
} from '@glean-rag-chat/core';
import { NextResponse } from 'next/server';

import { readJsonRequestBody } from '../request.js';

type ChatRouteService = Pick<ChatService, 'chat'>;

export interface CreateChatRouteHandlerOptions {
  service?: ChatRouteService;
}

function getDefaultService() {
  const env = loadEnv({ cwd: process.cwd() });

  return createChatService({
    env,
    logger: createLogger({
      level: env.LOG_LEVEL,
      name: 'glean-rag-chat-web'
    })
  });
}

export function createChatRouteHandler(options: CreateChatRouteHandlerOptions = {}) {
  return async function POST(request: Request) {
    try {
      const body = await readJsonRequestBody(request);
      const service = options.service ?? getDefaultService();
      const result = (await service.chat(body)) satisfies ChatSuccessResult;

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
          statusReason: 'Unexpected error while generating chat response.'
        },
        { status: 500 }
      );
    }
  };
}

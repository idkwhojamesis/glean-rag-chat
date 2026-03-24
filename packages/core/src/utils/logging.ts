import pino, { type Logger, type LoggerOptions } from 'pino';

import type { AppEnv } from '../config/env.js';

export interface CreateLoggerOptions extends LoggerOptions {
  level?: AppEnv['LOG_LEVEL'];
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const { level = 'info', ...loggerOptions } = options;

  return pino({
    name: 'glean-rag-chat',
    level,
    serializers: {
      err: pino.stdSerializers.err
    },
    ...loggerOptions
  });
}

export const logger = createLogger();

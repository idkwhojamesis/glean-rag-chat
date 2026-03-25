import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

import type { AppEnv } from '../config/env.js';

export interface CreateLoggerOptions extends LoggerOptions {
  level?: AppEnv['LOG_LEVEL'];
  destination?: DestinationStream;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const { destination, level = 'info', ...loggerOptions } = options;
  const pinoOptions = {
    name: 'glean-rag-chat',
    level,
    serializers: {
      err: pino.stdSerializers.err
    },
    ...loggerOptions
  } satisfies LoggerOptions;

  return destination === undefined ? pino(pinoOptions) : pino(pinoOptions, destination);
}

export const logger = createLogger();

export type AppErrorDetails = Record<string, unknown>;

export interface AppErrorOptions {
  code: string;
  statusCode: number;
  details?: AppErrorDetails | undefined;
  expose?: boolean | undefined;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: AppErrorDetails | undefined;
  readonly expose: boolean;

  constructor(message: string, options: AppErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.expose = options.expose ?? false;
  }
}

export class InputValidationError extends AppError {
  constructor(message = 'Request validation failed', details?: AppErrorDetails, cause?: unknown) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      expose: true,
      ...(details === undefined ? {} : { details }),
      ...(cause === undefined ? {} : { cause })
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: AppErrorDetails, cause?: unknown) {
    super(message, {
      code: 'CONFLICT',
      statusCode: 409,
      expose: true,
      ...(details === undefined ? {} : { details }),
      ...(cause === undefined ? {} : { cause })
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, details?: AppErrorDetails, cause?: unknown) {
    super(message, {
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: 502,
      ...(details === undefined ? {} : { details }),
      ...(cause === undefined ? {} : { cause })
    });
  }
}

export class TimeoutError extends AppError {
  constructor(message: string, details?: AppErrorDetails, cause?: unknown) {
    super(message, {
      code: 'TIMEOUT',
      statusCode: 504,
      ...(details === undefined ? {} : { details }),
      ...(cause === undefined ? {} : { cause })
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

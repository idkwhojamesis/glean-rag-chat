import { TimeoutError } from './errors.js';

export interface RetryContext {
  attempt: number;
  error: unknown;
  nextDelayMs: number;
}

export interface RetryOptions {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean | Promise<boolean>;
  onRetry?: (context: RetryContext) => void | Promise<void>;
  signal?: AbortSignal;
}

export interface WithTimeoutOptions {
  timeoutMs: number;
  message?: string;
}

function createAbortError() {
  return new Error('The operation was aborted');
}

export function computeRetryDelay(attempt: number, options: Pick<RetryOptions, 'factor' | 'maxDelayMs' | 'minDelayMs'> = {}) {
  const minDelayMs = options.minDelayMs ?? 250;
  const factor = options.factor ?? 2;
  const maxDelayMs = options.maxDelayMs ?? 5000;

  return Math.min(Math.round(minDelayMs * factor ** Math.max(0, attempt - 1)), maxDelayMs);
}

export async function waitForDelay(delayMs: number, signal?: AbortSignal) {
  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(resolve, delayMs);

    const abortHandler = () => {
      clearTimeout(timeoutId);
      reject(createAbortError());
    };

    signal?.addEventListener('abort', abortHandler, { once: true });
  });
}

export async function retry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      const canRetry = attempt <= retries && (await options.shouldRetry?.(error, attempt)) !== false;

      if (!canRetry) {
        throw error;
      }

      const nextDelayMs = computeRetryDelay(attempt, options);

      await options.onRetry?.({
        attempt,
        error,
        nextDelayMs
      });

      await waitForDelay(nextDelayMs, options.signal);
    }
  }
}

export async function withTimeout<T>(promise: Promise<T>, options: WithTimeoutOptions): Promise<T> {
  if (options.timeoutMs <= 0) {
    throw new RangeError('timeoutMs must be greater than 0');
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(options.message ?? `Operation timed out after ${options.timeoutMs}ms`, { timeoutMs: options.timeoutMs }));
    }, options.timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

import { TimeoutError } from '../../../src/utils/errors.js';
import { computeRetryDelay, retry, withTimeout } from '../../../src/utils/retry.js';

describe('computeRetryDelay', () => {
  it('grows exponentially and respects the max delay', () => {
    expect(computeRetryDelay(1, { minDelayMs: 100, factor: 2, maxDelayMs: 250 })).toBe(100);
    expect(computeRetryDelay(2, { minDelayMs: 100, factor: 2, maxDelayMs: 250 })).toBe(200);
    expect(computeRetryDelay(3, { minDelayMs: 100, factor: 2, maxDelayMs: 250 })).toBe(250);
  });
});

describe('retry', () => {
  it('retries until the operation succeeds', async () => {
    let attempts = 0;

    const result = await retry(
      () => {
        attempts += 1;

        if (attempts < 3) {
          return Promise.reject(new Error('transient'));
        }

        return Promise.resolve('ok');
      },
      {
        retries: 3,
        minDelayMs: 0
      }
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('stops retrying when shouldRetry returns false', async () => {
    await expect(
      retry(
        () => {
          return Promise.reject(new Error('stop'));
        },
        {
          retries: 5,
          minDelayMs: 0,
          shouldRetry: () => false
        }
      )
    ).rejects.toThrow('stop');
  });
});

describe('withTimeout', () => {
  it('returns the underlying promise result before the timeout', async () => {
    await expect(withTimeout(Promise.resolve('ready'), { timeoutMs: 50 })).resolves.toBe('ready');
  });

  it('throws a TimeoutError when the promise exceeds the timeout', async () => {
    await expect(
      withTimeout(
        new Promise<string>(() => {
          // Intentionally never resolves.
        }),
        {
          timeoutMs: 10
        }
      )
    ).rejects.toBeInstanceOf(TimeoutError);
  });
});

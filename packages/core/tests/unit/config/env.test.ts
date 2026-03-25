import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { loadEnv, parseEnv } from '../../../src/config/env.js';
import { ConfigurationError } from '../../../src/utils/errors.js';

const originalEnv = { ...process.env };
const tempDirs: string[] = [];

afterEach(async () => {
  process.env = { ...originalEnv };

  await Promise.all(
    tempDirs.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    })
  );
});

describe('parseEnv', () => {
  it('applies defaults for datasource and log level', () => {
    const env = parseEnv({
      GLEAN_INSTANCE: 'acme',
      GLEAN_INDEXING_API_TOKEN: 'index-token',
      GLEAN_CLIENT_API_TOKEN: 'client-token',
      GLEAN_ACCESS_CHECK_USER_EMAIL: 'alex@glean-sandbox.com'
    });

    expect(env.GLEAN_DATASOURCE).toBe('interviewds');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('rejects missing required values', () => {
    expect(() =>
      parseEnv({
        GLEAN_INSTANCE: 'acme'
      })
    ).toThrow(ConfigurationError);
  });
});

describe('loadEnv', () => {
  it('merges .env, .env.local, and process.env with process.env taking precedence', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'glean-rag-chat-env-'));
    tempDirs.push(directory);

    await writeFile(
      path.join(directory, '.env'),
      [
        'GLEAN_INSTANCE=from-dot-env',
        'GLEAN_INDEXING_API_TOKEN=index-from-env',
        'GLEAN_CLIENT_API_TOKEN=client-from-env',
        'GLEAN_ACCESS_CHECK_USER_EMAIL=alex@glean-sandbox.com'
      ].join('\n')
    );

    await writeFile(path.join(directory, '.env.local'), 'GLEAN_INSTANCE=from-dot-env-local\nLOG_LEVEL=debug\n');

    process.env = {
      ...originalEnv,
      GLEAN_INSTANCE: 'from-process-env'
    };

    const env = loadEnv({ cwd: directory });

    expect(env.GLEAN_INSTANCE).toBe('from-process-env');
    expect(env.GLEAN_INDEXING_API_TOKEN).toBe('index-from-env');
    expect(env.LOG_LEVEL).toBe('debug');
  });

  it('loads env files from the nearest parent directory by default', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'glean-rag-chat-env-parent-'));
    const nestedDirectory = path.join(directory, 'apps', 'web');
    tempDirs.push(directory);
    await mkdir(nestedDirectory, { recursive: true });

    await writeFile(
      path.join(directory, '.env.local'),
      [
        'GLEAN_INSTANCE=from-parent',
        'GLEAN_INDEXING_API_TOKEN=index-from-parent',
        'GLEAN_CLIENT_API_TOKEN=client-from-parent',
        'GLEAN_ACCESS_CHECK_USER_EMAIL=alex@glean-sandbox.com'
      ].join('\n')
    );

    const env = loadEnv({ cwd: nestedDirectory });

    expect(env.GLEAN_INSTANCE).toBe('from-parent');
    expect(env.GLEAN_INDEXING_API_TOKEN).toBe('index-from-parent');
  });
});

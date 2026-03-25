import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parse } from 'dotenv';
import { z } from 'zod';

import { ConfigurationError } from '../utils/errors.js';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

export const envSchema = z.object({
  GLEAN_INSTANCE: z.string().trim().min(1),
  GLEAN_INDEXING_API_TOKEN: z.string().trim().min(1),
  GLEAN_CLIENT_API_TOKEN: z.string().trim().min(1),
  GLEAN_DATASOURCE: z.string().trim().min(1).default('interviewds'),
  GLEAN_ACCESS_CHECK_USER_EMAIL: z.string().trim().email(),
  LOG_LEVEL: z.enum(logLevels).default('info')
});

export type AppEnv = z.infer<typeof envSchema>;

export interface LoadEnvOptions {
  cwd?: string;
  files?: string[];
  searchParents?: boolean;
}

function readEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parse(readFileSync(filePath));
}

function hasAnyEnvFile(directory: string, files: string[]) {
  return files.some((fileName) => existsSync(path.resolve(directory, fileName)));
}

function resolveEnvDirectory(cwd: string, files: string[], searchParents: boolean) {
  if (!searchParents) {
    return cwd;
  }

  let currentDirectory = path.resolve(cwd);

  while (true) {
    if (hasAnyEnvFile(currentDirectory, files)) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return cwd;
    }

    currentDirectory = parentDirectory;
  }
}

export function parseEnv(input: Record<string, string | undefined>) {
  try {
    return envSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ConfigurationError(
        'Server environment is not configured. Set the required GLEAN_* values in .env.local or the process environment.',
        { issues: error.issues },
        error
      );
    }

    throw error;
  }
}

export function loadEnv(options: LoadEnvOptions = {}): AppEnv {
  const cwd = options.cwd ?? process.cwd();
  const files = options.files ?? ['.env', '.env.local'];
  const envDirectory = resolveEnvDirectory(cwd, files, options.searchParents ?? true);

  const fileValues = files.reduce<Record<string, string>>((values, fileName) => {
    const filePath = path.resolve(envDirectory, fileName);
    return {
      ...values,
      ...readEnvFile(filePath)
    };
  }, {});

  return parseEnv({
    ...fileValues,
    ...process.env
  });
}

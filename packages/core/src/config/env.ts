import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parse } from 'dotenv';
import { z } from 'zod';

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
}

function readEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parse(readFileSync(filePath));
}

export function parseEnv(input: Record<string, string | undefined>) {
  return envSchema.parse(input);
}

export function loadEnv(options: LoadEnvOptions = {}): AppEnv {
  const cwd = options.cwd ?? process.cwd();
  const files = options.files ?? ['.env', '.env.local'];

  const fileValues = files.reduce<Record<string, string>>((values, fileName) => {
    const filePath = path.resolve(cwd, fileName);
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

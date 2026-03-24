import type { Logger } from 'pino';

import type { AppEnv } from '../config/env.js';
import { Glean, type HTTPClient } from '../types/vendor.js';

export interface CreateGleanSdkOptions {
  env: Pick<AppEnv, 'GLEAN_CLIENT_API_TOKEN' | 'GLEAN_INDEXING_API_TOKEN' | 'GLEAN_INSTANCE'>;
  httpClient?: HTTPClient | undefined;
  logger?: Logger | undefined;
}

function createSdk(
  instance: string,
  apiToken: string,
  httpClient?: HTTPClient
) {
  return new Glean({
    instance,
    apiToken,
    ...(httpClient === undefined ? {} : { httpClient })
  });
}

export function createClientNamespaceSdk(options: CreateGleanSdkOptions) {
  options.logger?.debug({ instance: options.env.GLEAN_INSTANCE }, 'Creating Glean client namespace SDK');

  return createSdk(options.env.GLEAN_INSTANCE, options.env.GLEAN_CLIENT_API_TOKEN, options.httpClient);
}

export function createIndexingNamespaceSdk(options: CreateGleanSdkOptions) {
  options.logger?.debug({ instance: options.env.GLEAN_INSTANCE }, 'Creating Glean indexing namespace SDK');

  return createSdk(options.env.GLEAN_INSTANCE, options.env.GLEAN_INDEXING_API_TOKEN, options.httpClient);
}

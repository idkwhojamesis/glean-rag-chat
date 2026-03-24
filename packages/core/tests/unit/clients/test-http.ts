import { HTTPClient } from '../../../src/types/vendor.js';

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string;
}

export interface CreateCapturingHttpClientOptions {
  responseBody?: unknown;
  status?: number;
  responseContentType?: string;
}

export function createCapturingHttpClient(options: CreateCapturingHttpClientOptions = {}) {
  let capturedRequest: CapturedRequest | undefined;

  const httpClient = new HTTPClient({
    fetcher: async (request: Request | URL | string) => {
      const nextRequest = request instanceof Request ? request : new Request(request);

      capturedRequest = {
        url: nextRequest.url,
        method: nextRequest.method,
        headers: nextRequest.headers,
        body: await nextRequest.text()
      };

      const responseBody =
        options.responseBody === undefined ? null : JSON.stringify(options.responseBody);

      return new Response(responseBody, {
        status: options.status ?? 200,
        headers: {
          'content-type': options.responseContentType ?? 'application/json'
        }
      });
    }
  });

  return {
    httpClient,
    getCapturedRequest: () => {
      if (capturedRequest === undefined) {
        throw new Error('No request was captured');
      }

      return capturedRequest;
    }
  };
}

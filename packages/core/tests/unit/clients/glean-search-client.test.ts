import { createGleanSearchClient } from '../../../src/clients/glean-search-client.js';
import { mapChatInputToSearchRequest } from '../../../src/mappers/search-payload.js';
import { createCapturingHttpClient } from './test-http.js';

describe('glean search client', () => {
  it('sends the mapped search payload to the Glean search endpoint', async () => {
    const { httpClient, getCapturedRequest } = createCapturingHttpClient({
      responseBody: {
        results: [],
        trackingToken: 'search-token-123'
      }
    });

    const client = createGleanSearchClient({
      env: {
        GLEAN_CLIENT_API_TOKEN: 'client-token',
        GLEAN_INSTANCE: 'acme'
      },
      httpClient
    });

    await client.search(
      mapChatInputToSearchRequest(
        {
          newMessage: 'What does onboarding say?',
          trackingToken: 'search-token-123'
        },
        {
          datasource: 'interviewds'
        }
      )
    );

    const request = getCapturedRequest();

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://acme-be.glean.com/rest/api/v1/search');
    expect(JSON.parse(request.body)).toEqual({
      query: 'What does onboarding say?',
      trackingToken: 'search-token-123',
      pageSize: 10,
      maxSnippetSize: 300,
      requestOptions: {
        datasourceFilter: 'interviewds',
        facetBucketSize: 10,
        responseHints: ['RESULTS']
      }
    });
  });
});

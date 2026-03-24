import { createGleanIndexingClient } from '../../../src/clients/glean-indexing-client.js';
import { mapIndexDocumentInputToIndexDocumentRequest } from '../../../src/mappers/index-payload.js';
import { createCapturingHttpClient } from './test-http.js';

describe('glean indexing client', () => {
  it('sends the mapped indexing payload to the single-document indexing endpoint', async () => {
    const { httpClient, getCapturedRequest } = createCapturingHttpClient({
      status: 200
    });

    const client = createGleanIndexingClient({
      env: {
        GLEAN_DATASOURCE: 'interviewds',
        GLEAN_INDEXING_API_TOKEN: 'indexing-token',
        GLEAN_INSTANCE: 'acme'
      },
      httpClient
    });

    await client.indexDocument(
      mapIndexDocumentInputToIndexDocumentRequest(
        {
          url: 'https://example.com/docs/onboarding',
          type: 'Documentation',
          title: 'Onboarding Guide',
          body: 'Body text',
          summary: 'Summary text',
          purpose: 'Interview prep'
        },
        {
          datasource: 'interviewds',
          documentId: 'doc-onboarding-123'
        }
      )
    );

    const request = getCapturedRequest();

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://acme-be.glean.com/api/index/v1/indexdocument');
    expect(JSON.parse(request.body)).toEqual({
      document: {
        datasource: 'interviewds',
        objectType: 'Documentation',
        viewURL: 'https://example.com/docs/onboarding',
        id: 'doc-onboarding-123',
        title: 'Onboarding Guide',
        body: {
          mimeType: 'text/plain',
          textContent: 'Body text'
        },
        permissions: {
          allowAllDatasourceUsersAccess: true
        },
        summary: {
          mimeType: 'text/plain',
          textContent: 'Summary text'
        },
        customProperties: [
          {
            name: 'Purpose',
            value: 'Interview prep'
          }
        ]
      }
    });
  });

  it('sends debug requests to the datasource-scoped debug endpoint', async () => {
    const { httpClient, getCapturedRequest } = createCapturingHttpClient({
      responseBody: {
        status: {
          uploadStatus: 'UPLOADED',
          indexingStatus: 'INDEXED'
        }
      },
      responseContentType: 'application/json; charset=UTF-8'
    });

    const client = createGleanIndexingClient({
      env: {
        GLEAN_DATASOURCE: 'interviewds',
        GLEAN_INDEXING_API_TOKEN: 'indexing-token',
        GLEAN_INSTANCE: 'acme'
      },
      httpClient
    });

    await client.debugDocument({
      objectType: 'Documentation',
      docId: 'doc-onboarding-123'
    });

    const request = getCapturedRequest();

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://acme-be.glean.com/api/index/v1/debug/interviewds/document');
    expect(JSON.parse(request.body)).toEqual({
      objectType: 'Documentation',
      docId: 'doc-onboarding-123'
    });
  });

  it('sends access-check requests to the document access endpoint', async () => {
    const { httpClient, getCapturedRequest } = createCapturingHttpClient({
      responseBody: {
        hasAccess: true
      }
    });

    const client = createGleanIndexingClient({
      env: {
        GLEAN_DATASOURCE: 'interviewds',
        GLEAN_INDEXING_API_TOKEN: 'indexing-token',
        GLEAN_INSTANCE: 'acme'
      },
      httpClient
    });

    await client.checkDocumentAccess({
      datasource: 'interviewds',
      objectType: 'Documentation',
      docId: 'doc-onboarding-123',
      userEmail: 'alex@glean-sandbox.com'
    });

    const request = getCapturedRequest();

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://acme-be.glean.com/api/index/v1/checkdocumentaccess');
    expect(JSON.parse(request.body)).toEqual({
      datasource: 'interviewds',
      objectType: 'Documentation',
      docId: 'doc-onboarding-123',
      userEmail: 'alex@glean-sandbox.com'
    });
  });
});

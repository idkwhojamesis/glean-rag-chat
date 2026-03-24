import {
  buildDocumentSpecsFromSearchResults,
  mapChatInputToSearchRequest,
  mapSearchResultsToSourceRefs
} from '../../../src/mappers/search-payload.js';

describe('search payload mapper', () => {
  it('builds a datasource-filtered search request from chat input', () => {
    const request = mapChatInputToSearchRequest(
      {
        newMessage: 'What does onboarding say?',
        trackingToken: 'search-token-123'
      },
      {
        datasource: 'interviewds'
      }
    );

    expect(request).toEqual({
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

  it('builds document specs from search results and prefers document IDs', () => {
    const documentSpecs = buildDocumentSpecsFromSearchResults([
      {
        url: 'https://example.com/docs/onboarding',
        document: {
          id: 'doc-123',
          title: 'Onboarding Guide',
          url: 'https://example.com/docs/onboarding'
        }
      },
      {
        url: 'https://example.com/docs/onboarding',
        document: {
          id: 'doc-123',
          title: 'Onboarding Guide',
          url: 'https://example.com/docs/onboarding'
        }
      },
      {
        url: 'https://example.com/docs/benefits'
      }
    ]);

    expect(documentSpecs).toEqual([{ id: 'doc-123' }, { url: 'https://example.com/docs/benefits' }]);
  });

  it('maps search results into structured source references', () => {
    const sources = mapSearchResultsToSourceRefs([
      {
        title: 'Onboarding Guide',
        url: 'https://example.com/docs/onboarding',
        document: {
          metadata: {
            documentId: 'doc-123'
          }
        },
        snippets: [
          {
            text: 'Install your laptop first.'
          }
        ]
      }
    ]);

    expect(sources).toEqual([
      {
        documentId: 'doc-123',
        title: 'Onboarding Guide',
        url: 'https://example.com/docs/onboarding',
        snippets: ['Install your laptop first.']
      }
    ]);
  });
});

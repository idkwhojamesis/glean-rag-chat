import { ExternalServiceError, TimeoutError, createIndexDocumentService } from '../../src/index.js';

describe('indexDocumentService', () => {
  const env = {
    GLEAN_ACCESS_CHECK_USER_EMAIL: 'alex@glean-sandbox.com',
    GLEAN_CLIENT_API_TOKEN: 'client-token',
    GLEAN_DATASOURCE: 'interviewds',
    GLEAN_INDEXING_API_TOKEN: 'indexing-token',
    GLEAN_INSTANCE: 'acme'
  } as const;

  const indexedResponse = {
    status: {
      uploadStatus: 'UPLOADED',
      indexingStatus: 'INDEXED'
    }
  };

  it('indexes a document, polls until indexed, verifies access, and confirms discoverability', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest
        .fn()
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'NOT_UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValueOnce(indexedResponse),
      getDocumentStatus: jest.fn(),
      checkDocumentAccess: jest.fn().mockResolvedValue({
        hasAccess: true
      })
    };
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        results: [
          {
            document: {
              id: 'doc-onboarding-guide-20260324t153045000z'
            },
            url: 'https://example.com/docs/onboarding'
          }
        ]
      })
    };
    const waitForDelay = jest.fn().mockResolvedValue(undefined);

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay,
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        title: 'Onboarding Guide',
        body: 'Body text',
        summary: 'Summary text',
        purpose: 'Interview prep'
      })
    ).resolves.toEqual({
      status: 'SUCCESS',
      documentId: 'doc-onboarding-guide-20260324t153045000z',
      verification: {
        debugStatus: 'INDEXED',
        accessCheck: true,
        searchCheck: true
      }
    });

    expect(indexingClient.indexDocument).toHaveBeenCalledWith({
      document: {
        datasource: 'interviewds',
        objectType: 'Documentation',
        viewURL: 'https://example.com/docs/onboarding',
        id: 'doc-onboarding-guide-20260324t153045000z',
        title: 'Onboarding Guide',
        body: {
          mimeType: 'text/plain',
          textContent: 'Body text'
        },
        summary: {
          mimeType: 'text/plain',
          textContent: 'Summary text'
        },
        permissions: {
          allowAllDatasourceUsersAccess: true
        },
        customProperties: [
          {
            name: 'Purpose',
            value: 'Interview prep'
          }
        ]
      }
    });
    expect(indexingClient.debugDocument).toHaveBeenCalledTimes(3);
    expect(indexingClient.checkDocumentAccess).toHaveBeenCalledWith({
      datasource: 'interviewds',
      objectType: 'Documentation',
      docId: 'doc-onboarding-guide-20260324t153045000z',
      userEmail: 'alex@glean-sandbox.com'
    });
    expect(searchClient.search).toHaveBeenCalledWith({
      query: 'doc-onboarding-guide-20260324t153045000z',
      trackingToken: undefined,
      pageSize: 10,
      maxSnippetSize: 300,
      requestOptions: {
        datasourceFilter: 'interviewds',
        facetBucketSize: 10,
        responseHints: ['RESULTS']
      }
    });
    expect(waitForDelay).toHaveBeenCalledTimes(1);
  });

  it('falls back to the document status endpoint when debug requests fail', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest.fn().mockRejectedValue(new Error('debug unavailable')),
      getDocumentStatus: jest
        .fn()
        .mockResolvedValueOnce({
          uploadStatus: 'STATUS_UNKNOWN',
          indexingStatus: 'STATUS_UNKNOWN'
        })
        .mockResolvedValueOnce({
          uploadStatus: 'UPLOADED',
          indexingStatus: 'NOT_INDEXED'
        })
        .mockResolvedValueOnce({
          uploadStatus: 'UPLOADED',
          indexingStatus: 'INDEXED'
        }),
      checkDocumentAccess: jest.fn().mockResolvedValue({
        hasAccess: true
      })
    };
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        results: [
          {
            document: {
              id: 'doc-onboarding-guide-20260324t153045000z'
            },
            url: 'https://example.com/docs/onboarding'
          }
        ]
      })
    };
    const waitForDelay = jest.fn().mockResolvedValue(undefined);

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay,
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        title: 'Onboarding Guide',
        body: 'Body text'
      })
    ).resolves.toMatchObject({
      status: 'SUCCESS',
      documentId: 'doc-onboarding-guide-20260324t153045000z',
      verification: {
        debugStatus: 'INDEXED',
        accessCheck: true,
        searchCheck: true
      }
    });

    expect(indexingClient.debugDocument).toHaveBeenCalledTimes(3);
    expect(indexingClient.getDocumentStatus).toHaveBeenCalledTimes(3);
    expect(waitForDelay).toHaveBeenCalledTimes(1);
  });

  it('retries search verification until the document becomes discoverable', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest
        .fn()
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'NOT_UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValueOnce(indexedResponse),
      getDocumentStatus: jest.fn(),
      checkDocumentAccess: jest.fn().mockResolvedValue({
        hasAccess: true
      })
    };
    const searchClient = {
      search: jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              document: {
                id: 'different-doc-id'
              },
              url: 'https://example.com/docs/benefits'
            }
          ]
        })
        .mockResolvedValueOnce({
          results: [
            {
              document: {
                id: 'doc-onboarding-guide-20260324t153045000z'
              },
              url: 'https://example.com/docs/onboarding'
            }
          ]
        })
    };
    const waitForDelay = jest.fn().mockResolvedValue(undefined);

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay,
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollDelayMs: 0,
      searchPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        title: 'Onboarding Guide',
        body: 'Body text'
      })
    ).resolves.toMatchObject({
      status: 'SUCCESS',
      documentId: 'doc-onboarding-guide-20260324t153045000z',
      verification: {
        debugStatus: 'INDEXED',
        accessCheck: true,
        searchCheck: true
      }
    });

    expect(searchClient.search).toHaveBeenCalledTimes(2);
    expect(waitForDelay).toHaveBeenCalledTimes(1);
  });

  it('accepts Glean custom datasource search IDs for the indexed document', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest
        .fn()
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'NOT_UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValueOnce(indexedResponse),
      getDocumentStatus: jest.fn(),
      checkDocumentAccess: jest.fn().mockResolvedValue({
        hasAccess: true
      })
    };
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        results: [
          {
            document: {
              id: 'CUSTOM_INTERVIEWDS_Documentation_doc-onboarding-guide-20260324t153045000z',
              url: 'https://example.com/docs/onboarding'
            },
            url: 'https://example.com/docs/onboarding'
          }
        ]
      })
    };

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay: jest.fn().mockResolvedValue(undefined),
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        title: 'Onboarding Guide',
        body: 'Body text'
      })
    ).resolves.toMatchObject({
      status: 'SUCCESS',
      documentId: 'doc-onboarding-guide-20260324t153045000z',
      verification: {
        debugStatus: 'INDEXED',
        accessCheck: true,
        searchCheck: true
      }
    });
  });

  it('regenerates the document ID when the first candidate already exists', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest
        .fn()
        .mockResolvedValueOnce(indexedResponse)
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'NOT_UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValueOnce(indexedResponse),
      getDocumentStatus: jest.fn(),
      checkDocumentAccess: jest.fn().mockResolvedValue({
        hasAccess: true
      })
    };
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        results: [
          {
            document: {
              id: 'doc-onboarding-guide-20260324t153045001z'
            },
            url: 'https://example.com/docs/onboarding'
          }
        ]
      })
    };

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay: jest.fn().mockResolvedValue(undefined),
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        title: 'Onboarding Guide',
        body: 'Body text'
      })
    ).resolves.toMatchObject({
      status: 'SUCCESS',
      documentId: 'doc-onboarding-guide-20260324t153045001z'
    });

    expect(indexingClient.indexDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          id: 'doc-onboarding-guide-20260324t153045001z'
        })
      })
    );
  });

  it('times out when debug polling never reaches INDEXED', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest
        .fn()
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'NOT_UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValue({
          status: {
            uploadStatus: 'UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        }),
      getDocumentStatus: jest.fn(),
      checkDocumentAccess: jest.fn()
    };
    const searchClient = {
      search: jest.fn()
    };

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay: jest.fn().mockResolvedValue(undefined),
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollAttempts: 3,
      debugPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        body: 'Body text'
      })
    ).rejects.toMatchObject<Partial<TimeoutError>>({
      message:
        'Document indexing timed out before reaching INDEXED status. Last observed status: upload=UPLOADED, indexing=NOT_INDEXED.'
    });

    expect(indexingClient.checkDocumentAccess).not.toHaveBeenCalled();
    expect(searchClient.search).not.toHaveBeenCalled();
  });

  it('fails when the access check returns false', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest
        .fn()
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'NOT_UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValueOnce(indexedResponse),
      getDocumentStatus: jest.fn(),
      checkDocumentAccess: jest.fn().mockResolvedValue({
        hasAccess: false
      })
    };
    const searchClient = {
      search: jest.fn()
    };

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay: jest.fn().mockResolvedValue(undefined),
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        body: 'Body text'
      })
    ).rejects.toMatchObject<Partial<ExternalServiceError>>({
      message: 'Indexed document failed access verification'
    });

    expect(searchClient.search).not.toHaveBeenCalled();
  });

  it('fails when the document is not discoverable through search', async () => {
    const indexingClient = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      debugDocument: jest
        .fn()
        .mockResolvedValueOnce({
          status: {
            uploadStatus: 'NOT_UPLOADED',
            indexingStatus: 'NOT_INDEXED'
          }
        })
        .mockResolvedValueOnce(indexedResponse),
      getDocumentStatus: jest.fn(),
      checkDocumentAccess: jest.fn().mockResolvedValue({
        hasAccess: true
      })
    };
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        results: [
          {
            document: {
              id: 'different-doc-id'
            },
            url: 'https://example.com/docs/benefits'
          }
        ]
      })
    };

    const service = createIndexDocumentService({
      env,
      indexingClient,
      searchClient,
      waitForDelay: jest.fn().mockResolvedValue(undefined),
      now: () => new Date('2026-03-24T15:30:45.000Z'),
      debugPollDelayMs: 0,
      searchPollAttempts: 2,
      searchPollDelayMs: 0
    });

    await expect(
      service.indexDocument({
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        body: 'Body text'
      })
    ).rejects.toMatchObject<Partial<ExternalServiceError>>({
      message: 'Indexed document is not discoverable through search yet. Last observed search result IDs: different-doc-id.'
    });

    expect(searchClient.search).toHaveBeenCalledTimes(2);
  });
});

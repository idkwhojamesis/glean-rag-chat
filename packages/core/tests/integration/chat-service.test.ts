import { ExternalServiceError, createChatService } from '../../src/index.js';

describe('chatService', () => {
  const env = {
    GLEAN_CLIENT_API_TOKEN: 'client-token',
    GLEAN_DATASOURCE: 'interviewds',
    GLEAN_INSTANCE: 'acme'
  } as const;

  it('runs the Search -> Chat workflow and returns normalized chat results', async () => {
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        trackingToken: 'search-token-123',
        results: [
          {
            document: {
              id: 'doc-123',
              title: 'Onboarding Guide',
              url: 'https://example.com/docs/onboarding'
            },
            snippets: [
              {
                text: 'Install the laptop before day one.'
              }
            ],
            url: 'https://example.com/docs/onboarding'
          },
          {
            document: {
              metadata: {
                documentId: 'doc-456'
              },
              title: 'Benefits Guide',
              url: 'https://example.com/docs/benefits'
            },
            url: 'https://example.com/docs/benefits'
          }
        ]
      })
    };
    const chatClient = {
      chat: jest.fn().mockResolvedValue({
        messages: [
          {
            author: 'GLEAN_AI',
            messageType: 'CONTENT',
            fragments: [
              {
                text: 'Install the laptop before day one.',
                citation: {
                  sourceDocument: {
                    id: 'doc-123',
                    title: 'Onboarding Guide',
                    url: 'https://example.com/docs/onboarding'
                  },
                  referenceRanges: [
                    {
                      snippets: [
                        {
                          text: 'Install the laptop before day one.'
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        ],
        followUpPrompts: ['What about benefits?'],
        chatSessionTrackingToken: 'chat-session-token'
      })
    };

    const service = createChatService({
      env,
      searchClient,
      chatClient
    });

    await expect(
      service.chat({
        newMessage: 'What should I do before day one?',
        rawMessages: [
          {
            author: 'USER',
            fragments: [{ text: 'What does onboarding say?' }]
          },
          {
            author: 'GLEAN_AI',
            fragments: [{ text: 'It covers setup and orientation.' }]
          }
        ],
        trackingToken: 'prior-token'
      })
    ).resolves.toEqual({
      status: 'SUCCESS',
      answer: 'Install the laptop before day one.[1]',
      parsedMessages: [
        {
          role: 'ASSISTANT',
          content: 'Install the laptop before day one.[1]',
          sources: [
            {
              documentId: 'doc-123',
              title: 'Onboarding Guide',
              url: 'https://example.com/docs/onboarding',
              snippets: ['Install the laptop before day one.']
            }
          ]
        }
      ],
      sources: [
        {
          documentId: 'doc-123',
          title: 'Onboarding Guide',
          url: 'https://example.com/docs/onboarding',
          snippets: ['Install the laptop before day one.']
        },
        {
          documentId: 'doc-456',
          title: 'Benefits Guide',
          url: 'https://example.com/docs/benefits'
        }
      ],
      followUpPrompts: ['What about benefits?'],
      trackingToken: 'chat-session-token'
    });

    expect(searchClient.search).toHaveBeenCalledWith({
      query: 'What should I do before day one?',
      trackingToken: 'prior-token',
      pageSize: 10,
      maxSnippetSize: 300,
      requestOptions: {
        datasourceFilter: 'interviewds',
        facetBucketSize: 10,
        responseHints: ['RESULTS']
      }
    });
    expect(chatClient.chat).toHaveBeenCalledWith({
      messages: [
        {
          author: 'USER',
          messageType: 'CONTENT',
          fragments: [{ text: 'What should I do before day one?' }]
        },
        {
          author: 'USER',
          messageType: 'CONTEXT',
          fragments: [
            {
              text: 'Answer using only the provided datasource documents. If the documents do not support the answer, say that directly.'
            }
          ]
        },
        {
          author: 'GLEAN_AI',
          fragments: [{ text: 'It covers setup and orientation.' }]
        },
        {
          author: 'USER',
          fragments: [{ text: 'What does onboarding say?' }]
        }
      ],
      inclusions: {
        documentSpecs: [{ id: 'doc-123' }, { id: 'doc-456' }]
      }
    });
  });

  it('still calls Chat when Search returns zero results and falls back to the Search tracking token', async () => {
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        trackingToken: 'search-token-456',
        results: []
      })
    };
    const chatClient = {
      chat: jest.fn().mockResolvedValue({
        messages: [
          {
            author: 'GLEAN_AI',
            messageType: 'CONTENT',
            fragments: [{ text: 'I could not find supporting documents in interviewds.' }]
          }
        ]
      })
    };

    const service = createChatService({
      env,
      searchClient,
      chatClient
    });

    await expect(
      service.chat({
        newMessage: 'What does the relocation policy say?',
        rawMessages: []
      })
    ).resolves.toEqual({
      status: 'SUCCESS',
      answer: 'I could not find supporting documents in interviewds.',
      parsedMessages: [
        {
          role: 'ASSISTANT',
          content: 'I could not find supporting documents in interviewds.'
        }
      ],
      sources: [],
      trackingToken: 'search-token-456'
    });

    expect(chatClient.chat).toHaveBeenCalledWith({
      messages: [
        {
          author: 'USER',
          messageType: 'CONTENT',
          fragments: [{ text: 'What does the relocation policy say?' }]
        },
        {
          author: 'USER',
          messageType: 'CONTEXT',
          fragments: [
            {
              text: 'Answer using only the provided datasource documents. If the documents do not support the answer, say that directly.'
            }
          ]
        }
      ]
    });
  });

  it('falls back to Search-derived sources when chat citations are missing required metadata', async () => {
    const searchClient = {
      search: jest.fn().mockResolvedValue({
        trackingToken: 'search-token-789',
        results: [
          {
            document: {
              id: 'doc-123',
              title: 'Onboarding Guide',
              url: 'https://example.com/docs/onboarding'
            },
            snippets: [
              {
                text: 'Install the laptop before day one.'
              }
            ],
            url: 'https://example.com/docs/onboarding'
          }
        ]
      })
    };
    const chatClient = {
      chat: jest.fn().mockResolvedValue({
        messages: [
          {
            author: 'GLEAN_AI',
            messageType: 'CONTENT',
            fragments: [
              {
                text: 'Install the laptop before day one.',
                citation: {
                  sourceDocument: {
                    id: 'doc-123'
                  }
                }
              }
            ]
          }
        ]
      })
    };

    const service = createChatService({
      env,
      searchClient,
      chatClient
    });

    await expect(
      service.chat({
        newMessage: 'What should I do before day one?',
        rawMessages: []
      })
    ).resolves.toEqual({
      status: 'SUCCESS',
      answer: 'Install the laptop before day one.',
      parsedMessages: [
        {
          role: 'ASSISTANT',
          content: 'Install the laptop before day one.'
        }
      ],
      sources: [
        {
          documentId: 'doc-123',
          title: 'Onboarding Guide',
          url: 'https://example.com/docs/onboarding',
          snippets: ['Install the laptop before day one.']
        }
      ],
      trackingToken: 'search-token-789'
    });
  });

  it('wraps Search failures as ExternalServiceError', async () => {
    const searchClient = {
      search: jest.fn().mockRejectedValue(new Error('search failed'))
    };
    const chatClient = {
      chat: jest.fn()
    };

    const service = createChatService({
      env,
      searchClient,
      chatClient
    });

    await expect(
      service.chat({
        newMessage: 'What should I do before day one?',
        rawMessages: []
      })
    ).rejects.toMatchObject<Partial<ExternalServiceError>>({
      message: 'Failed to search Glean for relevant documents'
    });

    expect(chatClient.chat).not.toHaveBeenCalled();
  });
});

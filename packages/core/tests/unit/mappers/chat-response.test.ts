import {
  mapChatResponseToChatResult,
  mapIndexingDebugStatusToVerificationStatus
} from '../../../src/mappers/chat-response.js';

describe('chat response mapper', () => {
  it('normalizes the chat response into answer, inline citation markers, sources, prompts, and tracking token', () => {
    const result = mapChatResponseToChatResult(
      {
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
              },
              {
                text: ' Follow the setup checklist.'
              },
              {
                text: ' Benefits enrollment starts after orientation.',
                citation: {
                  sourceDocument: {
                    id: 'doc-456',
                    title: 'Benefits Guide',
                    url: 'https://example.com/docs/benefits'
                  }
                }
              }
            ]
          },
          {
            author: 'GLEAN_AI',
            messageType: 'CONTENT',
            fragments: [
              {
                text: 'Fallback citations still work.'
              }
            ],
            citations: [
              {
                sourceDocument: {
                  id: 'doc-789',
                  title: 'IT Policies',
                  url: 'https://example.com/docs/it-policies'
                }
              }
            ]
          }
        ],
        followUpPrompts: ['What about benefits?'],
        chatSessionTrackingToken: 'chat-session-token'
      },
      {
        fallbackSources: [
          {
            documentId: 'doc-123',
            title: 'Onboarding Guide',
            url: 'https://example.com/docs/onboarding'
          }
        ]
      }
    );

    expect(result).toEqual({
      status: 'SUCCESS',
      answer: 'Install the laptop before day one.[1] Follow the setup checklist. Benefits enrollment starts after orientation.[2]',
      parsedMessages: [
        {
          role: 'ASSISTANT',
          content: 'Install the laptop before day one.[1] Follow the setup checklist. Benefits enrollment starts after orientation.[2]',
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
          ]
        },
        {
          role: 'ASSISTANT',
          content: 'Fallback citations still work.[3]',
          sources: [
            {
              documentId: 'doc-789',
              title: 'IT Policies',
              url: 'https://example.com/docs/it-policies'
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
        },
        {
          documentId: 'doc-789',
          title: 'IT Policies',
          url: 'https://example.com/docs/it-policies'
        }
      ],
      followUpPrompts: ['What about benefits?'],
      trackingToken: 'chat-session-token'
    });
  });

  it('maps indexing and upload states into the app-level verification status', () => {
    expect(mapIndexingDebugStatusToVerificationStatus('UPLOADED', 'INDEXED')).toBe('INDEXED');
    expect(mapIndexingDebugStatusToVerificationStatus('UPLOADED', 'NOT_INDEXED')).toBe('UPLOADED');
    expect(mapIndexingDebugStatusToVerificationStatus('NOT_UPLOADED', 'NOT_INDEXED')).toBe('NOT_FOUND');
    expect(mapIndexingDebugStatusToVerificationStatus('STATUS_UNKNOWN', 'STATUS_UNKNOWN')).toBe('UNKNOWN');
  });
});

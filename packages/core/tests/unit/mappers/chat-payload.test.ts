import {
  DEFAULT_GROUNDED_CONTEXT_MESSAGE,
  mapChatInputToChatRequest,
  normalizeRawChatMessagesForRequest
} from '../../../src/mappers/chat-payload.js';

describe('chat payload mapper', () => {
  it('normalizes chronological history into the most-recent-first order required by Glean', () => {
    const normalized = normalizeRawChatMessagesForRequest(
      [
        {
          author: 'USER',
          fragments: [{ text: 'Oldest question' }]
        },
        {
          author: 'GLEAN_AI',
          fragments: [{ text: 'Newest answer' }]
        }
      ],
      'chronological'
    );

    expect(normalized).toEqual([
      {
        author: 'GLEAN_AI',
        fragments: [{ text: 'Newest answer' }]
      },
      {
        author: 'USER',
        fragments: [{ text: 'Oldest question' }]
      }
    ]);
  });

  it('builds a chat request with the current question, grounding context, and document inclusions', () => {
    const request = mapChatInputToChatRequest(
      {
        newMessage: 'What does onboarding say?',
        rawMessages: [
          {
            author: 'USER',
            fragments: [{ text: 'Earlier question' }]
          }
        ]
      },
      {
        documentSpecs: [{ id: 'doc-123' }],
        timeoutMillis: 30000
      }
    );

    expect(request).toEqual({
      messages: [
        {
          author: 'USER',
          messageType: 'CONTENT',
          fragments: [{ text: 'What does onboarding say?' }]
        },
        {
          author: 'USER',
          messageType: 'CONTEXT',
          fragments: [{ text: DEFAULT_GROUNDED_CONTEXT_MESSAGE }]
        },
        {
          author: 'USER',
          fragments: [{ text: 'Earlier question' }]
        }
      ],
      inclusions: {
        documentSpecs: [{ id: 'doc-123' }]
      },
      timeoutMillis: 30000
    });
  });
});

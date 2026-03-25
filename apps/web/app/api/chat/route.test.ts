import { InputValidationError } from '@glean-rag-chat/core';

import { createChatRouteHandler } from './handler.js';

describe('/api/chat route', () => {
  it('returns a successful JSON response when the shared chat service succeeds', async () => {
    const service = {
      chat: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        answer: 'Install the laptop before day one.[1]',
        parsedMessages: [
          {
            role: 'ASSISTANT',
            content: 'Install the laptop before day one.[1]'
          }
        ],
        sources: [
          {
            documentId: 'doc-123',
            title: 'Onboarding Guide',
            url: 'https://example.com/docs/onboarding'
          }
        ],
        trackingToken: 'chat-session-token'
      })
    };
    const POST = createChatRouteHandler({ service });

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          newMessage: 'What should I do before day one?',
          rawMessages: [],
          trackingToken: 'search-token-123'
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      status: 'SUCCESS',
      answer: 'Install the laptop before day one.[1]',
      parsedMessages: [
        {
          role: 'ASSISTANT',
          content: 'Install the laptop before day one.[1]'
        }
      ],
      sources: [
        {
          documentId: 'doc-123',
          title: 'Onboarding Guide',
          url: 'https://example.com/docs/onboarding'
        }
      ],
      trackingToken: 'chat-session-token'
    });
    expect(response.status).toBe(200);
    expect(service.chat).toHaveBeenCalledWith({
      newMessage: 'What should I do before day one?',
      rawMessages: [],
      trackingToken: 'search-token-123'
    });
  });

  it('maps AppError failures to user-safe JSON errors', async () => {
    const service = {
      chat: jest.fn().mockRejectedValue(new InputValidationError('Message is required'))
    };
    const POST = createChatRouteHandler({ service });

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          rawMessages: []
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      status: 'ERROR',
      statusReason: 'Message is required'
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 when the request body is not valid JSON', async () => {
    const service = {
      chat: jest.fn()
    };
    const POST = createChatRouteHandler({ service });

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: '{'
      })
    );

    await expect(response.json()).resolves.toEqual({
      status: 'ERROR',
      statusReason: 'Request body must be valid JSON.'
    });
    expect(response.status).toBe(400);
    expect(service.chat).not.toHaveBeenCalled();
  });
});

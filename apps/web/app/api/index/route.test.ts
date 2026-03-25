import { InputValidationError } from '@glean-rag-chat/core';

import { createIndexRouteHandler } from './handler.js';

describe('/api/index route', () => {
  it('returns a successful JSON response when the shared service succeeds', async () => {
    const service = {
      indexDocument: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        documentId: 'doc-onboarding-guide-20260324t153045000z',
        verification: {
          debugStatus: 'INDEXED',
          accessCheck: true,
          searchCheck: true
        }
      })
    };
    const POST = createIndexRouteHandler({ service });

    const response = await POST(
      new Request('http://localhost/api/index', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com/docs/onboarding',
          type: 'Documentation',
          body: 'Body text'
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      status: 'SUCCESS',
      documentId: 'doc-onboarding-guide-20260324t153045000z',
      verification: {
        debugStatus: 'INDEXED',
        accessCheck: true,
        searchCheck: true
      }
    });
    expect(response.status).toBe(200);
    expect(service.indexDocument).toHaveBeenCalledWith({
      url: 'https://example.com/docs/onboarding',
      type: 'Documentation',
      body: 'Body text'
    });
  });

  it('maps AppError failures to user-safe JSON errors', async () => {
    const service = {
      indexDocument: jest.fn().mockRejectedValue(new InputValidationError('Document body is required'))
    };
    const POST = createIndexRouteHandler({ service });

    const response = await POST(
      new Request('http://localhost/api/index', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com/docs/onboarding',
          type: 'Documentation'
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      status: 'ERROR',
      statusReason: 'Document body is required'
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 when the request body is not valid JSON', async () => {
    const service = {
      indexDocument: jest.fn()
    };
    const POST = createIndexRouteHandler({ service });

    const response = await POST(
      new Request('http://localhost/api/index', {
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
    expect(service.indexDocument).not.toHaveBeenCalled();
  });
});

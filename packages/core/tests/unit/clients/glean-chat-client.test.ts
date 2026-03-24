import { createGleanChatClient } from '../../../src/clients/glean-chat-client.js';
import { mapChatInputToChatRequest } from '../../../src/mappers/chat-payload.js';
import { createCapturingHttpClient } from './test-http.js';

describe('glean chat client', () => {
  it('sends the mapped chat payload to the Glean chat endpoint', async () => {
    const { httpClient, getCapturedRequest } = createCapturingHttpClient({
      responseBody: {
        messages: []
      }
    });

    const client = createGleanChatClient({
      env: {
        GLEAN_CLIENT_API_TOKEN: 'client-token',
        GLEAN_INSTANCE: 'acme'
      },
      httpClient
    });

    await client.chat(
      mapChatInputToChatRequest(
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
          documentSpecs: [{ id: 'doc-123' }]
        }
      )
    );

    const request = getCapturedRequest();

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://acme-be.glean.com/rest/api/v1/chat');
    expect(JSON.parse(request.body)).toEqual({
      messages: [
        {
          author: 'USER',
          messageType: 'CONTENT',
          fragments: [{ text: 'What does onboarding say?' }]
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
          author: 'USER',
          messageType: 'CONTENT',
          fragments: [{ text: 'Earlier question' }]
        }
      ],
      inclusions: {
        documentSpecs: [{ id: 'doc-123' }]
      }
    });
  });
});

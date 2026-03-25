import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ExternalServiceError, InputValidationError } from '@glean-rag-chat/core';

import { createGleanInterviewdsMcpServer } from '../src/server.js';

describe('mcp server', () => {
  async function createHarness(chatService: { chat: jest.Mock }) {
    const server = createGleanInterviewdsMcpServer({ chatService });
    const client = new Client({
      name: 'mcp-test-client',
      version: '0.1.0'
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    return {
      client,
      server
    };
  }

  async function closeHarness(harness: Awaited<ReturnType<typeof createHarness>>) {
    await Promise.allSettled([harness.client.close(), harness.server.close()]);
  }

  it('registers ask-documents and returns concise answer plus structured sources', async () => {
    const chatService = {
      chat: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        answer: 'Install your laptop before day one.[1]',
        parsedMessages: [],
        sources: [
          {
            documentId: 'doc-123',
            title: 'Onboarding Guide',
            url: 'https://example.com/docs/onboarding'
          }
        ],
        trackingToken: 'chat-token'
      })
    };
    const harness = await createHarness(chatService);

    try {
      const tools = await harness.client.listTools();

      expect(tools.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'ask-documents',
            title: 'Ask Documents',
            description: 'Ask grounded questions over documents indexed into the interviewds Glean datasource.',
            outputSchema: expect.any(Object)
          })
        ])
      );

      const result = await harness.client.callTool({
        name: 'ask-documents',
        arguments: {
          question: 'What should I do before day one?'
        }
      });

      expect(chatService.chat).toHaveBeenCalledWith({
        newMessage: 'What should I do before day one?',
        rawMessages: []
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        answer: 'Install your laptop before day one.[1]',
        sources: [
          {
            documentId: 'doc-123',
            title: 'Onboarding Guide',
            url: 'https://example.com/docs/onboarding'
          }
        ]
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Install your laptop before day one.[1]\n\nSources:\n1. Onboarding Guide (https://example.com/docs/onboarding)'
        }
      ]);
    } finally {
      await closeHarness(harness);
    }
  });

  it('returns exposed validation failures as MCP tool errors', async () => {
    const chatService = {
      chat: jest.fn().mockRejectedValue(new InputValidationError('Message is required'))
    };
    const harness = await createHarness(chatService);

    try {
      const result = await harness.client.callTool({
        name: 'ask-documents',
        arguments: {
          question: '   '
        }
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Message is required'
        }
      ]);
    } finally {
      await closeHarness(harness);
    }
  });

  it('hides non-exposed service failures behind a generic MCP tool error', async () => {
    const chatService = {
      chat: jest.fn().mockRejectedValue(new ExternalServiceError('Vendor details should not leak'))
    };
    const harness = await createHarness(chatService);

    try {
      const result = await harness.client.callTool({
        name: 'ask-documents',
        arguments: {
          question: 'What does the guide say?'
        }
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Failed to generate grounded answer from interviewds.'
        }
      ]);
    } finally {
      await closeHarness(harness);
    }
  });
});

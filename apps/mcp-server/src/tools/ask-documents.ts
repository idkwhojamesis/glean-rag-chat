import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isAppError, type ChatService, type ChatSuccessResult } from '@glean-rag-chat/core';
import { z } from 'zod';

type AskDocumentsToolService = Pick<ChatService, 'chat'>;
type AskDocumentsToolOutput = Pick<ChatSuccessResult, 'answer' | 'sources'>;

export interface RegisterAskDocumentsToolOptions {
  service: AskDocumentsToolService;
}

export const askDocumentsInputSchema = {
  question: z.string().describe('Natural-language question about documents indexed in the interviewds datasource.')
} as const;

const sourceSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string(),
  snippets: z.array(z.string()).optional()
});

export const askDocumentsOutputSchema = {
  answer: z.string(),
  sources: z.array(sourceSchema)
} as const;

function formatAskDocumentsText(result: AskDocumentsToolOutput) {
  if (result.sources.length === 0) {
    return result.answer;
  }

  const sourceLines = result.sources.map((source, index) => `${index + 1}. ${source.title} (${source.url})`);

  return `${result.answer}\n\nSources:\n${sourceLines.join('\n')}`;
}

function getAskDocumentsErrorMessage(error: unknown) {
  if (isAppError(error) && error.expose) {
    return error.message;
  }

  return 'Failed to generate grounded answer from interviewds.';
}

export async function runAskDocumentsTool(
  question: string,
  options: RegisterAskDocumentsToolOptions
) {
  const result = await options.service.chat({
    newMessage: question,
    rawMessages: []
  });
  const output = {
    answer: result.answer,
    sources: result.sources
  } satisfies AskDocumentsToolOutput;

  return {
    content: [
      {
        type: 'text' as const,
        text: formatAskDocumentsText(output)
      }
    ],
    structuredContent: output
  };
}

export function registerAskDocumentsTool(server: McpServer, options: RegisterAskDocumentsToolOptions) {
  server.registerTool(
    'ask-documents',
    {
      title: 'Ask Documents',
      description: 'Ask grounded questions over documents indexed into the interviewds Glean datasource.',
      inputSchema: askDocumentsInputSchema,
      outputSchema: askDocumentsOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async ({ question }) => {
      try {
        return await runAskDocumentsTool(question, options);
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: getAskDocumentsErrorMessage(error)
            }
          ],
          isError: true
        };
      }
    }
  );
}

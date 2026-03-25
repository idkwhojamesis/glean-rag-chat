import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createChatService, createLogger, loadEnv, type ChatService } from '@glean-rag-chat/core';

import { registerAskDocumentsTool } from './tools/ask-documents.js';

type AskDocumentsChatService = Pick<ChatService, 'chat'>;

export interface CreateGleanInterviewdsMcpServerOptions {
  chatService?: AskDocumentsChatService;
}

function getDefaultChatService(): AskDocumentsChatService {
  const env = loadEnv({
    cwd: process.cwd()
  });

  return createChatService({
    env,
    logger: createLogger({
      destination: process.stderr,
      level: env.LOG_LEVEL,
      name: 'glean-rag-chat-mcp-server'
    })
  });
}

export function createGleanInterviewdsMcpServer(options: CreateGleanInterviewdsMcpServerOptions = {}) {
  const server = new McpServer({
    name: 'glean-interviewds-mcp-server',
    version: '0.1.0'
  });

  registerAskDocumentsTool(server, {
    service: options.chatService ?? getDefaultChatService()
  });

  return server;
}

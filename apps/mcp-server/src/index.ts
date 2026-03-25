import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createGleanInterviewdsMcpServer } from './server.js';

export async function main() {
  const server = createGleanInterviewdsMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('glean-interviewds-mcp-server is running on stdio');
}

void main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});

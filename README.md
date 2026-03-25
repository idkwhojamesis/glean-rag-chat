# Glean RAG Chat

`glean-rag-chat` is a small monorepo that indexes documents into the `interviewds` Glean datasource, verifies that those documents are discoverable, and exposes grounded chat over the same datasource through both a Next.js web app and a local MCP server.

The implementation is split into three parts:
- `apps/web`: single-page UI plus `/api/index` and `/api/chat`
- `packages/core`: shared validation, Glean clients, mappers, and workflow services
- `apps/mcp-server`: stdio MCP server with one `ask-documents` tool

See [docs/architecture.md](/home/james/glean-chatbot/glean-rag-chat/docs/architecture.md) for the longer design note.

## Requirements

- Node.js 20+
- `corepack` enabled so `pnpm` is available
- Glean sandbox credentials for:
  - `GLEAN_INSTANCE`
  - `GLEAN_INDEXING_API_TOKEN`
  - `GLEAN_CLIENT_API_TOKEN`
  - `GLEAN_ACCESS_CHECK_USER_EMAIL`

## Setup

```bash
cd /home/james/glean-chatbot/glean-rag-chat
cp .env.example .env.local
corepack pnpm install
```

Set the following values in `.env.local`:

```dotenv
GLEAN_INSTANCE=support-lab
GLEAN_INDEXING_API_TOKEN=...
GLEAN_CLIENT_API_TOKEN=...
GLEAN_DATASOURCE=interviewds
GLEAN_ACCESS_CHECK_USER_EMAIL=alex@glean-sandbox.com
LOG_LEVEL=info
```

`loadEnv` searches from the current working directory upward, so the web app, MCP server, and smoke script can all share the same root `.env.local`.

## Run

Start the web app:

```bash
corepack pnpm dev:web
```

Start the MCP server directly:

```bash
corepack pnpm dev:mcp
```

Run tests and typecheck:

```bash
corepack pnpm test
corepack pnpm typecheck
```

## VS Code MCP Setup

This repo includes [`.vscode/mcp.json`](/home/james/glean-chatbot/glean-rag-chat/.vscode/mcp.json) for the case where `glean-rag-chat` itself is the VS Code workspace root. The config uses `envFile` and starts the stdio server with:

```json
{
  "servers": {
    "glean-mcp-rag": {
      "type": "stdio",
      "command": "corepack",
      "args": [
        "pnpm",
        "--dir",
        "${workspaceFolder}",
        "--filter",
        "@glean-rag-chat/mcp-server",
        "start"
      ],
      "envFile": "${workspaceFolder}/.env.local"
    }
  }
}
```

If you open the parent workspace instead of this repo root, use the base workspace `.vscode/mcp.json` and point `--dir` at `/home/james/glean-chatbot/glean-rag-chat`, which matches the working config in this environment.

Official VS Code MCP docs:
- https://code.visualstudio.com/docs/copilot/customization/mcp-servers
- https://code.visualstudio.com/docs/copilot/reference/mcp-configuration

## Manual Smoke Test

Sample payloads live in [scripts/sample-payloads/index-documentation.json](/home/james/glean-chatbot/glean-rag-chat/scripts/sample-payloads/index-documentation.json), [scripts/sample-payloads/index-letter.json](/home/james/glean-chatbot/glean-rag-chat/scripts/sample-payloads/index-letter.json), and [scripts/sample-payloads/chat-question.json](/home/james/glean-chatbot/glean-rag-chat/scripts/sample-payloads/chat-question.json).

Run the live smoke script:

```bash
corepack pnpm smoke
```

Skip re-indexing and only test chat:

```bash
corepack pnpm smoke -- --skip-index
```

The smoke script is intentionally manual. It talks to live Glean services, indexes real documents, waits for discoverability, and prints the final grounded answer plus normalized sources.

## Architecture Summary

Indexing flow:
1. Validate the request.
2. Generate a document ID from the URL/title slug plus timestamp.
3. Verify uniqueness through the debug/status endpoints.
4. Index the document into `interviewds`.
5. Poll until the document is indexed.
6. Check access for `GLEAN_ACCESS_CHECK_USER_EMAIL`.
7. Confirm discoverability through Search by document ID.

Chat flow:
1. Validate the request.
2. Search `interviewds` for relevant documents.
3. Build `documentSpecs` from Search results.
4. Call Glean Chat with the user message, prior history, and grounded document inclusions.
5. Normalize answer text, parsed messages, citations, sources, and tracking token for both the web UI and MCP tool.

## Assumptions And Limitations

- The implementation is scoped to one datasource: `interviewds`.
- Documents are manually entered; the app does not crawl or extract content from the supplied URL.
- Live smoke runs are opt-in because they depend on real credentials and mutate the datasource.
- Search verification currently checks discoverability primarily by document ID and canonical URL matching, not by a full semantic content assertion.
- The MCP server is stdio-based, so its logger is forced to stderr to avoid corrupting MCP protocol output on stdout.

# Architecture Note

## Goal

This project implements a constrained RAG workflow on top of Glean:
- ingest manually provided documents into the `interviewds` datasource,
- verify that those documents are indexed, accessible, and searchable,
- answer grounded questions over the same datasource through both a web app and an MCP tool.

The design keeps vendor-specific behavior at the edges and shares the orchestration logic between transports.

## Components

### `apps/web`

The web app is the user-facing interface. It exposes:
- a document indexing form,
- a chat interface that stores normalized local message state,
- two thin server routes: `/api/index` and `/api/chat`.

Those routes do not contain workflow logic. They parse JSON, load environment configuration, call the shared services in `packages/core`, and translate `AppError` instances into user-safe HTTP responses.

### `packages/core`

This package owns the application contract and all shared orchestration:
- `validation/`: Zod schemas for incoming index and chat requests
- `clients/`: thin wrappers over Glean Indexing, Search, and Chat APIs
- `mappers/`: pure translation between app types and vendor payloads
- `services/`: end-to-end workflows for indexing and chat
- `utils/`: error types, logging, retry/delay helpers, and document ID generation

This is the main seam that keeps both the web app and MCP server consistent.

### `apps/mcp-server`

The MCP server exposes a single `ask-documents` tool. It delegates directly to `chatService`, then returns:
- a concise text answer for human-readable clients,
- structured `answer` and `sources` for tool-aware clients.

Because the server uses stdio transport, all logs are written to stderr rather than stdout so MCP protocol traffic stays clean.

## Data Flow

### Indexing

`indexDocumentService` implements the ingest and verification path:

1. Parse and validate the incoming request.
2. Generate a candidate document ID from the normalized input plus timestamp.
3. Check the debug/status endpoints to avoid collisions.
4. Map the app request into the Glean Index Document payload:
   - `body` and `summary` become `ContentDefinition`
   - `purpose` maps to the datasource custom property
   - permissions are set so datasource users can access the document
5. Submit the indexing request.
6. Poll until the document reaches an indexed state or times out.
7. Run `checkDocumentAccess` for `GLEAN_ACCESS_CHECK_USER_EMAIL`.
8. Run a Search-based discoverability check using the new document ID.
9. Return a normalized success payload with verification details.

The workflow is intentionally conservative: the app only declares success once indexing, access, and search discoverability all succeed.

### Chat

`chatService` implements the shared retrieve-then-generate workflow:

1. Parse and validate the request.
2. Convert normalized app message history into the ordering expected by the Glean Chat API.
3. Run Glean Search scoped to `interviewds`.
4. Build `inclusions.documentSpecs` from the Search results.
5. Call Glean Chat with the user query and grounded document inclusions.
6. Normalize the answer into:
   - `answer`
   - `parsedMessages`
   - `sources`
   - optional `followUpPrompts`
   - normalized `trackingToken`

The Search step is always executed first so the Chat request is grounded in datasource-specific results instead of relying on open-ended generation.

## Error Model And Hardening

- Validation failures become `InputValidationError` and are safe to expose.
- Downstream API failures are wrapped in `ExternalServiceError`.
- Polling failures and long-running ingest states use `TimeoutError`.
- The web routes now return `400` for malformed JSON bodies instead of a generic `500`.
- Default service creation now honors `LOG_LEVEL`.
- The MCP server creates a stderr-backed logger to avoid mixing logs with stdio transport output.

## Tradeoffs

- The implementation is intentionally single-datasource and single-tool. That keeps the payload mapping and verification logic explicit, but it is not yet generalized for multiple datasources or attachment types.
- Document ingestion is manual. The canonical URL is stored and used for verification, but the system does not fetch or extract content from that URL.
- Live smoke validation is included as a script rather than CI because it depends on external credentials and mutates the sandbox datasource.

## Extension Points

- Make datasource and access-check user configurable.
- Add richer Search verification based on expected snippets, not only document ID/URL matching.
- Support follow-up prompt rendering in the web client.
- Add ingestion from fetched URLs or uploaded files once the prototype scope expands.

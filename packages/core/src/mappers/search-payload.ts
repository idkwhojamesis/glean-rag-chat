import type { ChatInput, SourceRef } from '../types/domain.js';
import {
  GleanResponseHint,
  type GleanDocumentSpec,
  type GleanSearchRequest,
  type GleanSearchResult
} from '../types/vendor.js';

export const DEFAULT_SEARCH_PAGE_SIZE = 10;
export const DEFAULT_SEARCH_MAX_SNIPPET_SIZE = 300;
export const DEFAULT_SEARCH_FACET_BUCKET_SIZE = 10;

export interface MapChatInputToSearchRequestOptions {
  datasource: string;
  pageSize?: number;
  maxSnippetSize?: number;
  facetBucketSize?: number;
  timeoutMillis?: number;
}

export function mapChatInputToSearchRequest(
  input: Pick<ChatInput, 'newMessage' | 'trackingToken'>,
  options: MapChatInputToSearchRequestOptions
): GleanSearchRequest {
  return {
    query: input.newMessage,
    trackingToken: input.trackingToken,
    pageSize: options.pageSize ?? DEFAULT_SEARCH_PAGE_SIZE,
    maxSnippetSize: options.maxSnippetSize ?? DEFAULT_SEARCH_MAX_SNIPPET_SIZE,
    ...(options.timeoutMillis === undefined ? {} : { timeoutMillis: options.timeoutMillis }),
    requestOptions: {
      datasourceFilter: options.datasource,
      facetBucketSize: options.facetBucketSize ?? DEFAULT_SEARCH_FACET_BUCKET_SIZE,
      responseHints: [GleanResponseHint.Results]
    }
  };
}

export function buildDocumentSpecsFromSearchResults(results: readonly GleanSearchResult[]): GleanDocumentSpec[] {
  const seen = new Set<string>();
  const documentSpecs: GleanDocumentSpec[] = [];

  for (const result of results) {
    const documentId = result.document?.id ?? result.document?.metadata?.documentId;
    const documentUrl = result.document?.url ?? result.url;
    const key = documentId === undefined ? `url:${documentUrl}` : `id:${documentId}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (documentId !== undefined) {
      documentSpecs.push({ id: documentId });
      continue;
    }

    if (documentUrl !== undefined) {
      documentSpecs.push({ url: documentUrl });
    }
  }

  return documentSpecs;
}

export function mapSearchResultsToSourceRefs(results: readonly GleanSearchResult[]): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];

  for (const result of results) {
    const documentId = result.document?.id ?? result.document?.metadata?.documentId;
    const title = result.document?.title ?? result.title;
    const url = result.document?.url ?? result.url;

    if (documentId === undefined || title === undefined || url === undefined) {
      continue;
    }

    if (seen.has(documentId)) {
      continue;
    }

    seen.add(documentId);

    const snippets = result.snippets
      ?.map((snippet) => snippet.text ?? snippet.snippet)
      .filter((snippet): snippet is string => snippet !== undefined && snippet.length > 0);

    sources.push({
      documentId,
      title,
      url,
      ...(snippets === undefined || snippets.length === 0 ? {} : { snippets })
    });
  }

  return sources;
}

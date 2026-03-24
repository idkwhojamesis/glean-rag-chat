import type { ChatSuccessResult, IndexDocumentSuccessResult } from '../types/api.js';
import type { ParsedMessage, ParsedMessageRole, SourceRef } from '../types/domain.js';
import type {
  GleanChatMessage,
  GleanChatMessageCitation,
  GleanChatResponse,
  GleanSearchResult
} from '../types/vendor.js';
import { mapSearchResultsToSourceRefs } from './search-payload.js';

const HIDDEN_MESSAGE_TYPES = new Set([
  'CONTEXT',
  'CONTROL',
  'CONTROL_START',
  'CONTROL_FINISH',
  'CONTROL_CANCEL',
  'CONTROL_RETRY',
  'CONTROL_UNKNOWN',
  'DEBUG',
  'DEBUG_EXTERNAL',
  'SERVER_TOOL',
  'UPDATE'
]);

export interface MapChatResponseToResultOptions {
  fallbackSources?: SourceRef[];
  fallbackTrackingToken?: string;
}

type SourceMarkerLookup = ReadonlyMap<string, number>;

function mapAuthorToParsedRole(author: GleanChatMessage['author']): ParsedMessageRole {
  return author === 'USER' ? 'USER' : 'ASSISTANT';
}

function extractSnippetsFromCitation(citation: GleanChatMessageCitation) {
  return (
    citation.referenceRanges
      ?.flatMap(
        (referenceRange) =>
          referenceRange.snippets
            ?.map((snippet) => snippet.text ?? snippet.snippet)
            .filter((snippet): snippet is string => snippet !== undefined && snippet.length > 0) ?? []
      ) ?? []
  );
}

function mapCitationToSourceRef(citation: GleanChatMessageCitation): SourceRef | null {
  const sourceDocument = citation.sourceDocument;
  const documentId = sourceDocument?.id ?? sourceDocument?.metadata?.documentId;
  const title = sourceDocument?.title;
  const url = sourceDocument?.url;

  if (documentId === undefined || title === undefined || url === undefined) {
    return null;
  }

  const snippets = extractSnippetsFromCitation(citation);

  return {
    documentId,
    title,
    url,
    ...(snippets.length === 0 ? {} : { snippets })
  };
}

function mergeSourceRefs(sources: readonly SourceRef[]) {
  const merged = new Map<string, SourceRef>();

  for (const source of sources) {
    const existing = merged.get(source.documentId);

    if (existing === undefined) {
      merged.set(source.documentId, source);
      continue;
    }

    const snippets = new Set([...(existing.snippets ?? []), ...(source.snippets ?? [])]);

    merged.set(source.documentId, {
      ...existing,
      ...(snippets.size === 0 ? {} : { snippets: [...snippets] })
    });
  }

  return [...merged.values()];
}

function createSourceMarkerLookup(sources: readonly SourceRef[]): SourceMarkerLookup {
  return new Map(sources.map((source, index) => [source.documentId, index + 1]));
}

function getCitationMarker(citation: GleanChatMessageCitation, sourceMarkerLookup: SourceMarkerLookup) {
  const source = mapCitationToSourceRef(citation);

  if (source === null) {
    return '';
  }

  const marker = sourceMarkerLookup.get(source.documentId);

  return marker === undefined ? '' : `[${marker}]`;
}

function extractMessageText(
  message: GleanChatMessage,
  sourceMarkerLookup?: SourceMarkerLookup
) {
  const content =
    message.fragments
      ?.map((fragment) => {
        const text = fragment.text ?? '';

        if (sourceMarkerLookup === undefined || fragment.citation === undefined) {
          return text;
        }

        return `${text}${getCitationMarker(fragment.citation, sourceMarkerLookup)}`;
      })
      .filter((text) => text.length > 0)
      .join('') ?? '';

  if (content.length === 0 || sourceMarkerLookup === undefined) {
    return content;
  }

  const hasInlineCitation = message.fragments?.some((fragment) => fragment.citation !== undefined) ?? false;

  if (hasInlineCitation) {
    return content;
  }

  const fallbackMarkers = [
    ...new Set(
      (message.citations ?? [])
        .map((citation) => getCitationMarker(citation, sourceMarkerLookup))
        .filter((marker) => marker.length > 0)
    )
  ];

  return fallbackMarkers.length === 0 ? content : `${content}${fallbackMarkers.join('')}`;
}

export function extractSourceRefsFromChatMessage(message: GleanChatMessage): SourceRef[] {
  const citations = [
    ...(message.citations ?? []),
    ...(message.fragments?.flatMap((fragment) => (fragment.citation === undefined ? [] : [fragment.citation])) ?? [])
  ];

  return citations
    .map(mapCitationToSourceRef)
    .filter((source): source is SourceRef => source !== null);
}

export function mapChatMessageToParsedMessage(
  message: GleanChatMessage,
  sourceMarkerLookup?: SourceMarkerLookup
): ParsedMessage | null {
  if (message.messageType !== undefined && HIDDEN_MESSAGE_TYPES.has(message.messageType)) {
    return null;
  }

  const content = extractMessageText(message, sourceMarkerLookup);

  if (content.length === 0) {
    return null;
  }

  const sources = mergeSourceRefs(extractSourceRefsFromChatMessage(message));

  return {
    role: mapAuthorToParsedRole(message.author),
    content,
    ...(sources.length === 0 ? {} : { sources })
  };
}

export function mapSearchResultsToChatFallbackSources(results: readonly GleanSearchResult[]): SourceRef[] {
  return mapSearchResultsToSourceRefs(results);
}

export function mapChatResponseToChatResult(
  response: GleanChatResponse,
  options: MapChatResponseToResultOptions = {}
): ChatSuccessResult {
  const sources = mergeSourceRefs([
    ...(response.messages?.flatMap(extractSourceRefsFromChatMessage) ?? []),
    ...(options.fallbackSources ?? [])
  ]);
  const sourceMarkerLookup = createSourceMarkerLookup(sources);

  const parsedMessages = (response.messages ?? [])
    .map((message) => mapChatMessageToParsedMessage(message, sourceMarkerLookup))
    .filter((message): message is ParsedMessage => message !== null);

  const answer =
    parsedMessages.find((message) => message.role === 'ASSISTANT')?.content ??
    (response.messages ?? [])
      .map((message) => extractMessageText(message, sourceMarkerLookup))
      .find((content) => content.length > 0) ??
    '';

  return {
    status: 'SUCCESS',
    answer,
    parsedMessages,
    sources,
    ...(response.followUpPrompts === undefined || response.followUpPrompts.length === 0
      ? {}
      : { followUpPrompts: response.followUpPrompts }),
    ...(response.chatSessionTrackingToken ?? options.fallbackTrackingToken) === undefined
      ? {}
      : { trackingToken: response.chatSessionTrackingToken ?? options.fallbackTrackingToken }
  };
}

export function mapIndexingDebugStatusToVerificationStatus(
  uploadStatus?: string,
  indexingStatus?: string
): IndexDocumentSuccessResult['verification']['debugStatus'] {
  if (indexingStatus === 'INDEXED') {
    return 'INDEXED';
  }

  if (uploadStatus === 'UPLOADED') {
    return 'UPLOADED';
  }

  if (uploadStatus === 'NOT_UPLOADED' && indexingStatus === 'NOT_INDEXED') {
    return 'NOT_FOUND';
  }

  if (uploadStatus === 'FAILED' || indexingStatus === 'FAILED') {
    return 'FAILED';
  }

  return 'UNKNOWN';
}

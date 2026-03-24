import type { IndexDocumentInput } from '../types/domain.js';
import type {
  GleanContentDefinition,
  GleanDocumentDefinition,
  GleanDocumentPermissionsDefinition,
  GleanIndexDocumentRequest
} from '../types/vendor.js';

export const PURPOSE_CUSTOM_PROPERTY_NAME = 'Purpose';
export const DEFAULT_DOCUMENT_PERMISSIONS: GleanDocumentPermissionsDefinition = {
  allowAllDatasourceUsersAccess: true
};

export interface MapIndexDocumentInputOptions {
  datasource: string;
  documentId: string;
  customPropertyName?: string;
  permissions?: GleanDocumentPermissionsDefinition;
}

export function createPlainTextContentDefinition(text: string): GleanContentDefinition {
  return {
    mimeType: 'text/plain',
    textContent: text
  };
}

export function mapIndexDocumentInputToDocumentDefinition(
  input: IndexDocumentInput,
  options: MapIndexDocumentInputOptions
): GleanDocumentDefinition {
  return {
    datasource: options.datasource,
    objectType: input.type,
    viewURL: input.url,
    id: options.documentId,
    body: createPlainTextContentDefinition(input.body),
    permissions: options.permissions ?? DEFAULT_DOCUMENT_PERMISSIONS,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.summary === undefined ? {} : { summary: createPlainTextContentDefinition(input.summary) }),
    ...(input.purpose === undefined
      ? {}
      : {
          customProperties: [
            {
              name: options.customPropertyName ?? PURPOSE_CUSTOM_PROPERTY_NAME,
              value: input.purpose
            }
          ]
        })
  };
}

export function mapIndexDocumentInputToIndexDocumentRequest(
  input: IndexDocumentInput,
  options: MapIndexDocumentInputOptions
): GleanIndexDocumentRequest {
  return {
    document: mapIndexDocumentInputToDocumentDefinition(input, options)
  };
}

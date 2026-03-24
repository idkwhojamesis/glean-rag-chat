import {
  DEFAULT_DOCUMENT_PERMISSIONS,
  PURPOSE_CUSTOM_PROPERTY_NAME,
  createPlainTextContentDefinition,
  mapIndexDocumentInputToDocumentDefinition,
  mapIndexDocumentInputToIndexDocumentRequest
} from '../../../src/mappers/index-payload.js';

describe('index payload mapper', () => {
  it('creates plain text content definitions for Glean', () => {
    expect(createPlainTextContentDefinition('hello')).toEqual({
      mimeType: 'text/plain',
      textContent: 'hello'
    });
  });

  it('maps an app document input into the expected Glean document definition', () => {
    const documentDefinition = mapIndexDocumentInputToDocumentDefinition(
      {
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        title: 'Onboarding Guide',
        body: 'Body text',
        summary: 'Summary text',
        purpose: 'Interview prep'
      },
      {
        datasource: 'interviewds',
        documentId: 'doc-onboarding-123'
      }
    );

    expect(documentDefinition).toEqual({
      datasource: 'interviewds',
      objectType: 'Documentation',
      viewURL: 'https://example.com/docs/onboarding',
      id: 'doc-onboarding-123',
      title: 'Onboarding Guide',
      body: {
        mimeType: 'text/plain',
        textContent: 'Body text'
      },
      permissions: DEFAULT_DOCUMENT_PERMISSIONS,
      summary: {
        mimeType: 'text/plain',
        textContent: 'Summary text'
      },
      customProperties: [
        {
          name: PURPOSE_CUSTOM_PROPERTY_NAME,
          value: 'Interview prep'
        }
      ]
    });
  });

  it('wraps the document definition in the single-document indexing request shape', () => {
    const request = mapIndexDocumentInputToIndexDocumentRequest(
      {
        url: 'https://example.com/docs/onboarding',
        type: 'Documentation',
        body: 'Body text'
      },
      {
        datasource: 'interviewds',
        documentId: 'doc-onboarding-123'
      }
    );

    expect(request).toEqual({
      document: {
        datasource: 'interviewds',
        objectType: 'Documentation',
        viewURL: 'https://example.com/docs/onboarding',
        id: 'doc-onboarding-123',
        body: {
          mimeType: 'text/plain',
          textContent: 'Body text'
        },
        permissions: DEFAULT_DOCUMENT_PERMISSIONS
      }
    });
  });
});

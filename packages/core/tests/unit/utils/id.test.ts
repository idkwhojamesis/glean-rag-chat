import { createDocumentId, slugifyDocumentSegment } from '../../../src/utils/id.js';

describe('createDocumentId', () => {
  it('builds a timestamped slug from the document title', () => {
    const documentId = createDocumentId(
      {
        title: 'Team Onboarding Guide',
        url: 'https://example.com/docs/onboarding'
      },
      {
        timestamp: new Date('2026-03-19T19:30:00.000Z')
      }
    );

    expect(documentId).toBe('doc-team-onboarding-guide-20260319t193000000z');
  });

  it('falls back to the url path when the title is absent', () => {
    const documentId = createDocumentId(
      {
        url: 'https://example.com/docs/benefits-overview'
      },
      {
        prefix: 'candidate',
        timestamp: new Date('2026-03-19T19:30:00.000Z')
      }
    );

    expect(documentId).toBe('candidate-benefits-overview-20260319t193000000z');
  });
});

describe('slugifyDocumentSegment', () => {
  it('removes punctuation and collapses whitespace', () => {
    expect(slugifyDocumentSegment('  Alex\'s "First" Letter!  ')).toBe('alexs-first-letter');
  });
});

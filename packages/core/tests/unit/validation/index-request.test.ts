import { parseIndexDocumentInput } from '../../../src/validation/index-request.js';

describe('parseIndexDocumentInput', () => {
  it('normalizes optional empty strings to undefined', () => {
    const parsed = parseIndexDocumentInput({
      url: ' https://example.com/doc ',
      type: 'Documentation',
      title: ' ',
      body: ' Hello world ',
      summary: '',
      purpose: '  '
    });

    expect(parsed).toEqual({
      url: 'https://example.com/doc',
      type: 'Documentation',
      body: 'Hello world',
      title: undefined,
      summary: undefined,
      purpose: undefined
    });
  });

  it('rejects unsupported document types', () => {
    expect(() =>
      parseIndexDocumentInput({
        url: 'https://example.com/doc',
        type: 'Memo',
        body: 'Body text'
      })
    ).toThrow();
  });

  it('rejects non-http urls', () => {
    expect(() =>
      parseIndexDocumentInput({
        url: 'ftp://example.com/doc',
        type: 'Letter',
        body: 'Body text'
      })
    ).toThrow('URL must start with http:// or https://');
  });
});

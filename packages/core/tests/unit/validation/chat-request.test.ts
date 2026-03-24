import { parseChatInput } from '../../../src/validation/chat-request.js';

describe('parseChatInput', () => {
  it('defaults rawMessages and trims the tracking token', () => {
    const parsed = parseChatInput({
      newMessage: ' What changed? ',
      trackingToken: ' token-123 '
    });

    expect(parsed).toEqual({
      newMessage: 'What changed?',
      rawMessages: [],
      trackingToken: 'token-123'
    });
  });

  it('preserves raw Glean chat messages without stripping extra fields', () => {
    const rawMessage = {
      author: 'GLEAN_AI',
      messageType: 'CONTEXT',
      messageId: 'msg-123',
      messageTrackingToken: 'message-token-123',
      citations: [
        {
          trackingToken: 'citation-token-1',
          sourceDocument: {
            title: 'Onboarding Guide'
          }
        }
      ],
      fragments: [
        {
          text: '  Keep exact formatting here  ',
          citation: {
            trackingToken: 'inline-citation-token'
          },
          extraFragmentField: {
            nested: true
          }
        }
      ],
      agentConfig: {
        agentId: 'agent-123'
      },
      extraMessageField: {
        keep: 'this'
      }
    };

    const parsed = parseChatInput({
      newMessage: 'Summarize this',
      rawMessages: [rawMessage]
    });

    expect(parsed.rawMessages[0]).toEqual(rawMessage);
  });

  it('preserves unknown raw message enum values because the SDK models them as open enums', () => {
    const parsed = parseChatInput({
      newMessage: 'Latest update?',
      rawMessages: [
        {
          author: 'BOT',
          messageType: 'NON_STANDARD'
        }
      ]
    });

    expect(parsed.rawMessages[0]).toEqual({
      author: 'BOT',
      messageType: 'NON_STANDARD'
    });
  });
});

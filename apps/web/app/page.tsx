'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';

import styles from './page.module.css';

const documentTypeOptions = ['Documentation', 'Letter'] as const;

const fieldLimits = {
  url: 2048,
  title: 200,
  body: 20000,
  summary: 1000,
  purpose: 500,
  message: 4000
} as const;

type DocumentType = (typeof documentTypeOptions)[number];
type ParsedMessageRole = 'USER' | 'ASSISTANT';

interface SourceRef {
  documentId: string;
  title: string;
  url: string;
  snippets?: string[] | undefined;
}

interface ParsedMessage {
  role: ParsedMessageRole;
  content: string;
  sources?: SourceRef[] | undefined;
}

interface IndexSuccessResult {
  status: 'SUCCESS';
  documentId: string;
  verification: {
    debugStatus: string;
    accessCheck: boolean;
    searchCheck: boolean;
  };
}

interface ChatSuccessResult {
  status: 'SUCCESS';
  answer: string;
  parsedMessages: ParsedMessage[];
  sources: SourceRef[];
  trackingToken?: string | undefined;
  followUpPrompts?: string[] | undefined;
}

interface ApiErrorResult {
  status: 'ERROR';
  statusReason: string;
}

interface IndexFormState {
  url: string;
  type: DocumentType;
  title: string;
  body: string;
  summary: string;
  purpose: string;
}

const initialIndexForm: IndexFormState = {
  url: '',
  type: 'Documentation',
  title: '',
  body: '',
  summary: '',
  purpose: ''
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function stripInlineCitations(content: string) {
  return content.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

function createRawMessages(messages: ParsedMessage[]) {
  return messages.map((message) => ({
    author: message.role === 'USER' ? 'USER' : 'GLEAN_AI',
    fragments: [
      {
        text: message.role === 'ASSISTANT' ? stripInlineCitations(message.content) : message.content
      }
    ]
  }));
}

function mergeConversation(
  existingMessages: ParsedMessage[],
  nextUserMessage: ParsedMessage,
  nextParsedMessages: ParsedMessage[]
) {
  return nextParsedMessages.some((message) => message.role === 'USER')
    ? nextParsedMessages
    : [...existingMessages, nextUserMessage, ...nextParsedMessages];
}

function formatDebugStatus(status: string) {
  return status.toLowerCase().replace(/_/g, ' ');
}

function validateIndexForm(form: IndexFormState) {
  const trimmedUrl = form.url.trim();
  const trimmedBody = form.body.trim();

  if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
    return 'URL must start with http:// or https://';
  }

  if (trimmedBody.length === 0) {
    return 'Document body is required';
  }

  if (trimmedUrl.length > fieldLimits.url) {
    return `URL must be at most ${fieldLimits.url} characters`;
  }

  if (form.title.trim().length > fieldLimits.title) {
    return `Document title must be at most ${fieldLimits.title} characters`;
  }

  if (trimmedBody.length > fieldLimits.body) {
    return `Document body must be at most ${fieldLimits.body} characters`;
  }

  if (form.summary.trim().length > fieldLimits.summary) {
    return `Summary must be at most ${fieldLimits.summary} characters`;
  }

  if (form.purpose.trim().length > fieldLimits.purpose) {
    return `Purpose must be at most ${fieldLimits.purpose} characters`;
  }

  return null;
}

function validateChatMessage(message: string) {
  const trimmedMessage = message.trim();

  if (trimmedMessage.length === 0) {
    return 'Message is required';
  }

  if (trimmedMessage.length > fieldLimits.message) {
    return `Message must be at most ${fieldLimits.message} characters`;
  }

  return null;
}

async function postJson<TSuccess extends object>(url: string, payload: unknown): Promise<TSuccess> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as TSuccess | ApiErrorResult;

  if (!response.ok || ('status' in data && data.status === 'ERROR')) {
    throw new Error('statusReason' in data ? data.statusReason : `Request to ${url} failed.`);
  }

  return data as TSuccess;
}

export default function HomePage() {
  const [indexForm, setIndexForm] = useState<IndexFormState>(initialIndexForm);
  const [indexResult, setIndexResult] = useState<IndexSuccessResult | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [trackingToken, setTrackingToken] = useState<string | undefined>();
  const [followUpPrompts, setFollowUpPrompts] = useState<string[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatting, setIsChatting] = useState(false);
  const [isUiPending, startTransition] = useTransition();

  const latestAssistantSources = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === 'ASSISTANT' && message.sources?.length)
      ?.sources ?? [];
  }, [messages]);

  async function handleIndexSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateIndexForm(indexForm);

    if (validationError !== null) {
      setIndexError(validationError);
      setIndexResult(null);
      return;
    }

    setIsIndexing(true);
    setIndexError(null);

    try {
      const result = await postJson<IndexSuccessResult>('/api/index', indexForm);

      startTransition(() => {
        setIndexResult(result);
        setIndexError(null);
      });
    } catch (error) {
      setIndexError(getErrorMessage(error, 'Failed to index the document.'));
      setIndexResult(null);
    } finally {
      setIsIndexing(false);
    }
  }

  async function submitChatMessage(nextMessage: string) {
    const validationError = validateChatMessage(nextMessage);

    if (validationError !== null) {
      setChatError(validationError);
      return;
    }

    const trimmedMessage = nextMessage.trim();

    setIsChatting(true);
    setChatError(null);

    try {
      const result = await postJson<ChatSuccessResult>('/api/chat', {
        newMessage: trimmedMessage,
        rawMessages: createRawMessages(messages),
        ...(trackingToken === undefined ? {} : { trackingToken })
      });

      const nextUserMessage: ParsedMessage = {
        role: 'USER',
        content: trimmedMessage
      };

      startTransition(() => {
        setMessages((currentMessages) => mergeConversation(currentMessages, nextUserMessage, result.parsedMessages));
        setTrackingToken(result.trackingToken);
        setFollowUpPrompts(result.followUpPrompts ?? []);
        setChatInput('');
        setChatError(null);
      });
    } catch (error) {
      setChatError(getErrorMessage(error, 'Failed to generate a grounded answer.'));
    } finally {
      setIsChatting(false);
    }
  }

  function handleNewChat() {
    startTransition(() => {
      setMessages([]);
      setTrackingToken(undefined);
      setFollowUpPrompts([]);
      setChatError(null);
      setChatInput('');
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.title}>Glean RAG Chat</h1>
          </div>
          <p className={styles.heroBody}>
            Index a document into <code>interviewds</code>, confirm it is searchable, then ask grounded
            questions against the shared Search plus Chat workflow.
          </p>
          <div className={styles.pillRow}>
            <span className={styles.pill}>Local browser chat state</span>
            <span className={styles.pill}>Grounded citations</span>
            <span className={styles.pill}>Indexed document verification</span>
          </div>
        </section>

        <div className={styles.workspace}>
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.panelEyebrow}>Index Document</p>
                <h2 className={styles.panelTitle}>Publish a document into Glean</h2>
              </div>
              <span className={styles.stateBadge}>{isIndexing ? 'Indexing...' : 'Ready'}</span>
            </div>

            <form
              className={styles.form}
              onSubmit={(event) => {
                void handleIndexSubmit(event);
              }}
            >
              <label className={styles.field}>
                <span className={styles.label}>Canonical URL</span>
                <input
                  className={styles.input}
                  type="url"
                  value={indexForm.url}
                  maxLength={fieldLimits.url}
                  placeholder="https://example.com/docs/onboarding"
                  onChange={(event) => setIndexForm((current) => ({ ...current, url: event.target.value }))}
                />
              </label>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>Document type</span>
                  <select
                    className={styles.select}
                    value={indexForm.type}
                    onChange={(event) =>
                      setIndexForm((current) => ({
                        ...current,
                        type: event.target.value as DocumentType
                      }))
                    }
                  >
                    {documentTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Title</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={indexForm.title}
                    maxLength={fieldLimits.title}
                    placeholder="Onboarding Guide"
                    onChange={(event) => setIndexForm((current) => ({ ...current, title: event.target.value }))}
                  />
                  <span className={styles.charCount}>{indexForm.title.length}/{fieldLimits.title}</span>
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>Document body</span>
                <textarea
                  className={styles.textarea}
                  rows={9}
                  value={indexForm.body}
                  maxLength={fieldLimits.body}
                  placeholder="Paste the plain-text content you want indexed."
                  onChange={(event) => setIndexForm((current) => ({ ...current, body: event.target.value }))}
                />
                <span className={styles.charCount}>{indexForm.body.length}/{fieldLimits.body}</span>
              </label>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>Summary</span>
                  <textarea
                    className={styles.textareaCompact}
                    rows={4}
                    value={indexForm.summary}
                    maxLength={fieldLimits.summary}
                    placeholder="Optional abstract or teaser."
                    onChange={(event) => setIndexForm((current) => ({ ...current, summary: event.target.value }))}
                  />
                  <span className={styles.charCount}>{indexForm.summary.length}/{fieldLimits.summary}</span>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Purpose</span>
                  <textarea
                    className={styles.textareaCompact}
                    rows={4}
                    value={indexForm.purpose}
                    maxLength={fieldLimits.purpose}
                    placeholder="Optional context for why this document exists."
                    onChange={(event) => setIndexForm((current) => ({ ...current, purpose: event.target.value }))}
                  />
                  <span className={styles.charCount}>{indexForm.purpose.length}/{fieldLimits.purpose}</span>
                </label>
              </div>

              <div className={styles.buttonRow}>
                <button className={styles.primaryButton} type="submit" disabled={isIndexing || isUiPending}>
                  {isIndexing ? 'Indexing document...' : 'Index document'}
                </button>
              </div>
            </form>

            {indexError ? <p className={styles.errorBanner}>{indexError}</p> : null}

            {indexResult ? (
              <section className={styles.statusCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>Verified</p>
                    <h3 className={styles.statusTitle}>Document is ready for grounded chat</h3>
                  </div>
                  <span className={styles.successBadge}>Success</span>
                </div>

                <dl className={styles.statusGrid}>
                  <div className={styles.statusItem}>
                    <dt>Document ID</dt>
                    <dd>{indexResult.documentId}</dd>
                  </div>
                  <div className={styles.statusItem}>
                    <dt>Debug status</dt>
                    <dd>{formatDebugStatus(indexResult.verification.debugStatus)}</dd>
                  </div>
                  <div className={styles.statusItem}>
                    <dt>Access check</dt>
                    <dd>{indexResult.verification.accessCheck ? 'passed' : 'failed'}</dd>
                  </div>
                  <div className={styles.statusItem}>
                    <dt>Search check</dt>
                    <dd>{indexResult.verification.searchCheck ? 'passed' : 'failed'}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </section>

          <section className={`${styles.panel} ${styles.chatPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.panelEyebrow}>Grounded Chat</p>
                <h2 className={styles.panelTitle}>Ask questions against indexed content</h2>
              </div>
              <div className={styles.chatHeaderActions}>
                {trackingToken ? <span className={styles.tokenBadge}>Tracking token active</span> : null}
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={messages.length === 0 && trackingToken === undefined}
                  onClick={handleNewChat}
                >
                  New chat
                </button>
              </div>
            </div>

            <div className={styles.messageList}>
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>No conversation yet</p>
                  <p className={styles.emptyBody}>
                    Ask a question after you have indexed at least one document. Answers will include inline citation
                    markers and the related source metadata returned by the shared chat workflow.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <article
                    key={`${message.role}-${index}-${message.content}`}
                    className={`${styles.messageCard} ${
                      message.role === 'USER' ? styles.userMessage : styles.assistantMessage
                    }`}
                  >
                    <header className={styles.messageHeader}>
                      <span className={styles.messageRole}>
                        {message.role === 'USER' ? 'You' : 'Assistant'}
                      </span>
                    </header>
                    <p className={styles.messageContent}>{message.content}</p>

                    {message.sources?.length ? (
                      <ul className={styles.sourceList}>
                        {message.sources.map((source) => (
                          <li key={`${source.documentId}-${source.url}`} className={styles.sourceItem}>
                            <a className={styles.sourceLink} href={source.url} target="_blank" rel="noreferrer">
                              {source.title}
                            </a>
                            <p className={styles.sourceMeta}>{source.documentId}</p>
                            {source.snippets?.length ? (
                              <p className={styles.sourceSnippet}>{source.snippets[0]}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))
              )}
            </div>

            {latestAssistantSources.length > 0 ? (
              <section className={styles.latestSources}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>Latest Sources</p>
                    <h3 className={styles.statusTitle}>Documents used in the most recent answer</h3>
                  </div>
                </div>
                <ul className={styles.sourceList}>
                  {latestAssistantSources.map((source) => (
                    <li key={`${source.documentId}-${source.url}-latest`} className={styles.sourceItem}>
                      <a className={styles.sourceLink} href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                      <p className={styles.sourceMeta}>{source.documentId}</p>
                      {source.snippets?.length ? (
                        <p className={styles.sourceSnippet}>{source.snippets[0]}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {followUpPrompts.length > 0 ? (
              <div className={styles.promptRow}>
                {followUpPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className={styles.promptButton}
                    type="button"
                    disabled={isChatting || isUiPending}
                    onClick={() => {
                      void submitChatMessage(prompt);
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              className={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                void submitChatMessage(chatInput);
              }}
            >
              <label className={styles.field}>
                <span className={styles.label}>Ask a grounded question</span>
                <textarea
                  className={styles.textareaCompact}
                  rows={4}
                  value={chatInput}
                  maxLength={fieldLimits.message}
                  placeholder="What should an employee do before day one?"
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <span className={styles.charCount}>{chatInput.length}/{fieldLimits.message}</span>
              </label>

              <div className={styles.buttonRow}>
                <button className={styles.primaryButton} type="submit" disabled={isChatting || isUiPending}>
                  {isChatting ? 'Generating answer...' : 'Ask documents'}
                </button>
              </div>
            </form>

            {chatError ? <p className={styles.errorBanner}>{chatError}</p> : null}
          </section>
        </div>
      </div>
    </main>
  );
}

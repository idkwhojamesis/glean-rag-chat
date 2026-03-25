import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  createChatService,
  createIndexDocumentService,
  createLogger,
  isAppError,
  loadEnv,
  type ChatInput,
  type IndexDocumentInput
} from '../packages/core/src/index.ts';

const scriptDirectory = new URL('./', import.meta.url);
const samplePayloadDirectory = new URL('./sample-payloads/', scriptDirectory);

const indexPayloadFileNames = ['index-documentation.json', 'index-letter.json'] as const;
const chatPayloadFileName = 'chat-question.json';

function readJsonFile<T>(fileName: string): T {
  const fileUrl = new URL(fileName, samplePayloadDirectory);
  const filePath = fileURLToPath(fileUrl);

  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function printUsage() {
  console.log('Usage: corepack pnpm smoke [-- --skip-index]');
  console.log('Runs the live Glean smoke test using scripts/sample-payloads/*.json.');
}

async function main() {
  if (hasFlag('--help')) {
    printUsage();
    return;
  }

  const skipIndex = hasFlag('--skip-index');
  const env = loadEnv({ cwd: process.cwd() });
  const logger = createLogger({
    level: env.LOG_LEVEL,
    name: 'glean-rag-chat-smoke'
  });
  const indexService = createIndexDocumentService({ env, logger });
  const chatService = createChatService({ env, logger });

  console.log(`Using datasource ${env.GLEAN_DATASOURCE} on instance ${env.GLEAN_INSTANCE}.`);

  if (!skipIndex) {
    printSection('Index Documents');

    for (const fileName of indexPayloadFileNames) {
      const payload = readJsonFile<IndexDocumentInput>(fileName);
      const label = payload.title?.trim() || payload.url;

      console.log(`Indexing ${label} from ${fileName}...`);
      const result = await indexService.indexDocument(payload);

      console.log(`Indexed ${result.documentId}`);
      console.log(
        `Verification: debug=${result.verification.debugStatus} access=${String(result.verification.accessCheck)} search=${String(result.verification.searchCheck)}`
      );
    }
  } else {
    printSection('Index Documents');
    console.log('Skipped indexing. Reusing whatever is already in the datasource.');
  }

  printSection('Ask Question');

  const chatPayload = readJsonFile<ChatInput>(chatPayloadFileName);
  const chatResult = await chatService.chat(chatPayload);

  console.log(chatPayload.newMessage);
  console.log('');
  console.log(chatResult.answer);

  if (chatResult.sources.length > 0) {
    console.log('');
    console.log('Sources:');

    for (const [index, source] of chatResult.sources.entries()) {
      console.log(`${index + 1}. ${source.title} (${source.url}) [${source.documentId}]`);
    }
  }
}

void main().catch((error) => {
  if (isAppError(error)) {
    console.error(`${error.code}: ${error.message}`);

    if (error.details !== undefined) {
      console.error(JSON.stringify(error.details, null, 2));
    }
  } else if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error('Unknown smoke test failure');
  }

  process.exit(1);
});

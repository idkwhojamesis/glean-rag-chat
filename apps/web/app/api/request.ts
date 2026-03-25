import { InputValidationError } from '@glean-rag-chat/core';

export async function readJsonRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    throw new InputValidationError('Request body must be valid JSON.', undefined, error);
  }
}

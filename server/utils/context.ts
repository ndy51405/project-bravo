import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

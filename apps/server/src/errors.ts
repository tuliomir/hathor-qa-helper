import type { ApiErrorBody, ApiErrorCode } from '@qa-helper/shared/serverApi';
import { jsonResponse } from './json.ts';

/** An error with a known API code and HTTP status. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string) => new ApiError(400, 'BAD_REQUEST', message);
export const notFound = (message: string) => new ApiError(404, 'NOT_FOUND', message);

// wallet-lib's compiled classes don't set `name`, so match the constructor
// name. The message patterns cover sends that report shortfalls as plain
// `Error`/`SendTxError` ("Insufficient amount of tokens to fill the amount").
const INSUFFICIENT_CLASSES = new Set(['InsufficientFundsError']);
const INSUFFICIENT_MESSAGE = /insufficient amount|not enough (htr )?tokens|insufficient funds/i;
const BAD_INPUT_CLASSES = new Set(['AddressError', 'OutputValueError', 'InvalidOutputsError', 'InvalidWords']);

/** Maps anything thrown inside a request to an API error. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (!(err instanceof Error)) return new ApiError(500, 'INTERNAL', String(err));
  const cls = err.constructor?.name ?? '';
  if (INSUFFICIENT_CLASSES.has(cls) || INSUFFICIENT_MESSAGE.test(err.message)) {
    return new ApiError(422, 'INSUFFICIENT_FUNDS', err.message);
  }
  if (BAD_INPUT_CLASSES.has(cls)) return new ApiError(400, 'BAD_REQUEST', err.message);
  return new ApiError(500, 'LIB_ERROR', err.message || cls);
}

export function errorResponse(err: ApiError, headers: Record<string, string> = {}): Response {
  const body: ApiErrorBody = { error: { code: err.code, message: err.message } };
  return jsonResponse(body, err.status, headers);
}

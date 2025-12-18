/**
 * Retry utility for handling transient network failures
 */

import { logger } from './logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'ENETUNREACH',
    'EAI_AGAIN',
  ],
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { code?: string; status?: number; response?: { status?: number } };

  // Network errors
  if (err.code && retryableErrors.includes(err.code)) {
    return true;
  }

  // HTTP 5xx errors (server errors) are retryable
  const status = err.status || err.response?.status;
  if (status && status >= 500 && status < 600) {
    return true;
  }

  // HTTP 429 (Too Many Requests) is retryable
  if (status === 429) {
    return true;
  }

  return false;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - The async operation to retry
 * @param options - Retry options
 * @returns The result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry =
        attempt < config.maxAttempts && isRetryableError(error, config.retryableErrors);

      if (!shouldRetry) {
        throw error;
      }

      // Log retry attempt
      logger.warn(`Operation failed, retrying (${attempt}/${config.maxAttempts})`, {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null
              ? JSON.stringify(error)
              : String(error),
        delay,
        attempt,
      });

      // Wait before retrying
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Wrap a function with retry logic
 */
export function withRetry<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}

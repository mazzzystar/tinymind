export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Type guard to check if error has GitHub API response headers
 */
function hasRateLimitHeaders(error: unknown): error is { headers: Record<string, string> } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'headers' in error &&
    typeof (error as { headers: unknown }).headers === 'object'
  );
}

/**
 * Check if error is a rate limit that requires waiting until reset time
 * Rate limits can last for hours, so retrying with exponential backoff won't help
 */
function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 403 || status === 429) {
      // Check if this is a rate limit error (has rate limit headers)
      if (hasRateLimitHeaders(error)) {
        const headers = error.headers;
        // If we have rate limit reset header, this is a true rate limit
        if (headers['x-ratelimit-remaining'] === '0' || headers['x-ratelimit-reset']) {
          return true;
        }
      }
      // 429 is always a rate limit
      if (status === 429) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Default retry predicate - retries on common transient errors
 * Does NOT retry on rate limits (403 with rate limit headers, 429)
 */
const defaultShouldRetry = (error: unknown): boolean => {
  // Never retry rate limits - they can last for hours
  if (isRateLimitError(error)) {
    return false;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on:
    // - 409: SHA mismatch / conflict (concurrent update)
    // - 5xx: Server errors
    // Note: We don't retry 403 (could be rate limit) or 429 (definitely rate limit)
    return status === 409 || (status >= 500 && status < 600);
  }
  return false;
};

/**
 * Executes an async operation with exponential backoff retry logic.
 *
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 *
 * @example
 * const result = await withRetry(
 *   () => octokit.repos.getContent({ owner, repo, path }),
 *   { maxAttempts: 3, baseDelayMs: 1000 }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or error is not retryable
      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Exponential backoff with jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + jitter,
        maxDelayMs
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry predicate specifically for GitHub SHA conflict errors
 */
export function shouldRetryOnConflict(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 409;
  }
  return false;
}

/**
 * Check if an error is a rate limit error
 * Useful for UI to show appropriate message
 */
export function isRateLimited(error: unknown): boolean {
  return isRateLimitError(error);
}

/**
 * Get rate limit reset time if available
 * @returns Unix timestamp when rate limit resets, or null if not available
 */
export function getRateLimitResetTime(error: unknown): number | null {
  if (hasRateLimitHeaders(error)) {
    const resetHeader = error.headers['x-ratelimit-reset'];
    if (resetHeader) {
      const resetTime = parseInt(resetHeader, 10);
      if (!isNaN(resetTime)) {
        return resetTime;
      }
    }
  }
  return null;
}

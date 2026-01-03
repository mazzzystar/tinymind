import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, ErrorCodes.UNAUTHORIZED, message);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, ErrorCodes.BAD_REQUEST, message, details);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, ErrorCodes.NOT_FOUND, message);
  }

  static conflict(message = 'Resource conflict'): ApiError {
    return new ApiError(409, ErrorCodes.CONFLICT, message);
  }

  static rateLimited(message = 'Rate limit exceeded'): ApiError {
    return new ApiError(429, ErrorCodes.RATE_LIMITED, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, ErrorCodes.INTERNAL_ERROR, message);
  }
}

/**
 * Creates a standardized error response.
 * NEVER exposes stack traces in production.
 */
export function createErrorResponse(
  error: unknown,
  headers: Record<string, string> = {}
): NextResponse<ApiErrorResponse> {
  const isDev = process.env.NODE_ENV === 'development';

  // Handle our custom ApiError
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(isDev && error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode, headers }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return NextResponse.json(
      {
        error: `Validation failed: ${messages}`,
        code: ErrorCodes.VALIDATION_ERROR,
        ...(isDev ? { details: error.errors } : {}),
      },
      { status: 400, headers }
    );
  }

  // Handle GitHub API errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status as number;

    if (status === 401) {
      return NextResponse.json(
        { error: 'Authentication required', code: ErrorCodes.UNAUTHORIZED },
        { status: 401, headers }
      );
    }

    if (status === 403) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', code: ErrorCodes.RATE_LIMITED },
        { status: 429, headers }
      );
    }

    if (status === 404) {
      return NextResponse.json(
        { error: 'Resource not found', code: ErrorCodes.NOT_FOUND },
        { status: 404, headers }
      );
    }

    if (status === 409) {
      return NextResponse.json(
        { error: 'Resource conflict. Please retry.', code: ErrorCodes.CONFLICT },
        { status: 409, headers }
      );
    }
  }

  // Generic error - NEVER expose stack trace in production
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  return NextResponse.json(
    { error: message, code: ErrorCodes.INTERNAL_ERROR },
    { status: 500, headers }
  );
}

/**
 * Wraps an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  headers: Record<string, string> = {}
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error) => createErrorResponse(error, headers));
}

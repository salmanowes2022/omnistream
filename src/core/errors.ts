/**
 * Custom error classes for omnistream
 */

export class OmnistreamError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends OmnistreamError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, details);
  }
}

export class UnauthorizedError extends OmnistreamError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 401, details);
  }
}

export class AuthorizationError extends OmnistreamError {
  constructor(message: string = 'Not authorized', details?: unknown) {
    super(message, 403, details);
  }
}

export class ValidationError extends OmnistreamError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, details);
  }
}

export class NotFoundError extends OmnistreamError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, details);
  }
}

export class ConflictError extends OmnistreamError {
  constructor(message: string = 'Resource conflict', details?: unknown) {
    super(message, 409, details);
  }
}

export class PlatformError extends OmnistreamError {
  constructor(
    public platform: string,
    message: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(`${platform}: ${message}`, statusCode, details);
  }
}

export class UnsupportedFeatureError extends OmnistreamError {
  constructor(
    public platform: string,
    public feature: string,
    details?: unknown
  ) {
    super(`${platform} does not support ${feature}`, 501, details);
  }
}

export class RateLimitError extends OmnistreamError {
  constructor(message: string = 'Rate limit exceeded', details?: unknown) {
    super(message, 429, details);
  }
}

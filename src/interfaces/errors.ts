/**
 * @file Error classes for Stripe monetization plugin
 * @version 1.0.0
 */

/**
 * Base error class for Stripe monetization plugin
 */
export class StripeMonetizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'STRIPE_MONETIZATION_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'StripeMonetizationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StripeMonetizationError);
    }
  }
}

/**
 * Payment-related errors
 */
export class PaymentError extends StripeMonetizationError {
  constructor(
    message: string,
    code: string = 'PAYMENT_ERROR',
    statusCode: number = 402,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'PaymentError';
  }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends StripeMonetizationError {
  constructor(
    message: string,
    code: string = 'AUTHENTICATION_ERROR',
    statusCode: number = 401,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends StripeMonetizationError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    code: string = 'RATE_LIMIT_ERROR',
    statusCode: number = 429,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends StripeMonetizationError {
  constructor(
    message: string,
    code: string = 'CONFIGURATION_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends StripeMonetizationError {
  constructor(
    message: string,
    code: string = 'DATABASE_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'DatabaseError';
  }
}

/**
 * Stripe API-related errors
 */
export class StripeAPIError extends StripeMonetizationError {
  public readonly stripeCode?: string;

  constructor(
    message: string,
    stripeCode?: string,
    code: string = 'STRIPE_API_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'StripeAPIError';
    this.stripeCode = stripeCode;
  }
}

/**
 * Subscription-related errors
 */
export class SubscriptionError extends StripeMonetizationError {
  constructor(
    message: string,
    code: string = 'SUBSCRIPTION_ERROR',
    statusCode: number = 402,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'SubscriptionError';
  }
}

/**
 * Credit system errors
 */
export class CreditError extends StripeMonetizationError {
  constructor(
    message: string,
    code: string = 'CREDIT_ERROR',
    statusCode: number = 402,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'CreditError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends StripeMonetizationError {
  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'ValidationError';
  }
}
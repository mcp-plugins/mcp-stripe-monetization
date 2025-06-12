/**
 * @file Configuration Interfaces for Stripe Monetization Plugin
 * @version 1.0.0
 */

/**
 * Supported billing models
 */
export type BillingModel = 'per-call' | 'subscription' | 'usage-based' | 'freemium' | 'credit-system';

/**
 * Supported database types
 */
export type DatabaseType = 'sqlite' | 'postgresql' | 'mysql';

/**
 * Authentication methods
 */
export type AuthMethod = 'jwt' | 'api-key' | 'oauth' | 'none';

/**
 * Per-call billing configuration
 */
export interface PerCallConfig {
  /** Default price per tool call in cents */
  defaultPrice: number;
  /** Custom pricing per tool */
  toolPrices?: Record<string, number>;
  /** Volume discounts based on monthly usage */
  volumeDiscounts?: Array<{
    threshold: number;
    discountPercent: number;
  }>;
  /** Minimum charge per request */
  minimumCharge?: number;
}

/**
 * Subscription plan configuration
 */
export interface SubscriptionPlan {
  /** Unique plan identifier */
  id: string;
  /** Display name */
  name: string;
  /** Price in cents */
  price: number;
  /** Billing interval */
  interval: 'month' | 'year';
  /** Number of included tool calls */
  includedCalls: number;
  /** Price per additional call in cents */
  overagePrice: number;
  /** Features included in this plan */
  features?: string[];
  /** Maximum calls per month (null = unlimited) */
  maxCalls?: number | null;
}

/**
 * Subscription billing configuration
 */
export interface SubscriptionConfig {
  /** Available subscription plans */
  plans: SubscriptionPlan[];
  /** Allow plan changes */
  allowPlanChanges: boolean;
  /** Proration behavior */
  prorationBehavior: 'always_invoice' | 'none' | 'create_prorations';
  /** Trial period in days */
  trialPeriodDays?: number;
}

/**
 * Usage-based billing configuration
 */
export interface UsageBasedConfig {
  /** Stripe meter ID for tracking usage */
  meterId: string;
  /** Pricing tiers */
  tiers: Array<{
    upTo: number | null; // null for infinite
    pricePerUnit: number; // in cents
  }>;
  /** Billing period */
  billingPeriod: 'month' | 'year';
  /** Aggregate usage across tools */
  aggregateUsage: boolean;
}

/**
 * Freemium model configuration
 */
export interface FreemiumConfig {
  /** Free tier limits */
  freeTier: {
    callsPerMonth: number;
    tools?: string[]; // Specific tools available for free
  };
  /** Upgrade options */
  upgradeOptions: SubscriptionPlan[];
  /** Behavior when limit exceeded */
  limitExceededBehavior: 'block' | 'charge' | 'throttle';
}

/**
 * Credit package configuration
 */
export interface CreditPackage {
  /** Number of credits */
  credits: number;
  /** Price in cents */
  price: number;
  /** Package name */
  name: string;
  /** Bonus credits */
  bonusCredits?: number;
  /** Expiration in days */
  expirationDays?: number;
}

/**
 * Credit system configuration
 */
export interface CreditSystemConfig {
  /** Available credit packages */
  creditPackages: CreditPackage[];
  /** Credit cost per tool */
  toolPrices: Record<string, number>;
  /** Default credit cost */
  defaultCreditCost: number;
  /** Auto-recharge when low */
  autoRecharge?: {
    threshold: number;
    packageId: string;
  };
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Authentication method */
  method: AuthMethod;
  /** JWT configuration */
  jwt?: {
    secret: string;
    expiresIn: string;
    issuer?: string;
    audience?: string;
  };
  /** API key configuration */
  apiKey?: {
    headerName: string;
    prefix?: string;
    hashAlgorithm: 'sha256' | 'bcrypt';
  };
  /** OAuth configuration */
  oauth?: {
    provider: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** Database type */
  type: DatabaseType;
  /** Database connection string or config */
  connection: string | {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  /** Connection pool settings */
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  /** Auto-run migrations */
  runMigrations: boolean;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics */
  enabled: boolean;
  /** Retention period in days */
  retentionDays: number;
  /** Real-time dashboard */
  realtimeDashboard: boolean;
  /** Export capabilities */
  exportFormats: Array<'csv' | 'json' | 'xlsx'>;
  /** Custom metrics */
  customMetrics?: string[];
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Rate limiting */
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
  };
  /** IP filtering */
  ipFiltering?: {
    allowlist?: string[];
    blocklist?: string[];
  };
  /** Request validation */
  requestValidation: {
    maxPayloadSize: number;
    validateHeaders: boolean;
    requireUserAgent: boolean;
  };
  /** Webhook security */
  webhookSecurity: {
    verifySignatures: boolean;
    tolerance: number; // seconds
  };
}

/**
 * Main plugin configuration
 */
export interface StripeMonetizationConfig {
  /** Billing model to use */
  billingModel: BillingModel;
  
  /** Stripe configuration */
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    apiVersion?: string;
  };
  
  /** Model-specific configuration */
  billing: PerCallConfig | SubscriptionConfig | UsageBasedConfig | FreemiumConfig | CreditSystemConfig;
  
  /** Authentication configuration */
  authentication: AuthenticationConfig;
  
  /** Database configuration */
  database: DatabaseConfig;
  
  /** Analytics configuration */
  analytics?: AnalyticsConfig;
  
  /** Security configuration */
  security?: SecurityConfig;
  
  /** Environment */
  environment: 'development' | 'staging' | 'production';
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Custom webhook endpoint URL */
  webhookEndpoint?: string;
  
  /** Plugin metadata */
  metadata?: {
    name?: string;
    version?: string;
    description?: string;
  };
}
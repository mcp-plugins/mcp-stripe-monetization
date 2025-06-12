/**
 * @file MCP Stripe Monetization Plugin - Main Entry Point
 * @version 1.0.0
 * 
 * A comprehensive Stripe monetization plugin for MCP (Model Context Protocol) servers.
 * Enables multiple billing models including per-call, subscription, usage-based, 
 * freemium, and credit systems with enterprise-grade security and analytics.
 */

// Export main plugin class
export { StripeMonetizationPlugin } from './core/plugin.js';

// Export interfaces and types
export type {
  StripeMonetizationConfig,
  BillingModel,
  PerCallConfig,
  SubscriptionConfig,
  UsageBasedConfig,
  FreemiumConfig,
  CreditSystemConfig,
  AuthenticationConfig,
  DatabaseConfig,
  AnalyticsConfig,
  SecurityConfig
} from './interfaces/config.js';

export type {
  BillingContext,
  PaymentResult,
  UsageRecord,
  CustomerInfo,
  SubscriptionInfo,
  CreditBalance,
  BillingAnalytics
} from './interfaces/billing.js';

export type {
  StripeMonetizationError,
  PaymentError,
  AuthenticationError,
  RateLimitError,
  ConfigurationError
} from './interfaces/errors.js';

// Export utility functions
export { 
  validateConfig,
  createBasicSetup,
  createSubscriptionSetup,
  createUsageBasedSetup,
  createFreemiumSetup,
  createCreditSystemSetup,
  createDevelopmentSetup
} from './utils/helpers.js';

// Export convenience factory function
export { createStripeMonetizationPlugin } from './utils/factory.js';

// Export Stripe API endpoints for backend integration
export { StripeAPIEndpoints, createStripeRoutes } from './api/stripe-endpoints.js';

/**
 * Quick setup for basic per-call billing
 * 
 * @example
 * ```typescript
 * import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';
 * 
 * const config = createBasicSetup({
 *   stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
 *   stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   defaultPrice: 100, // $1.00 per call
 * });
 * 
 * const plugin = createStripeMonetizationPlugin(config);
 * 
 * // Use with MCP proxy wrapper
 * const proxiedServer = await wrapWithProxy(server, {
 *   plugins: [plugin]
 * });
 * ```
 */

/**
 * Advanced subscription setup
 * 
 * @example
 * ```typescript
 * import { createStripeMonetizationPlugin, createSubscriptionSetup } from 'mcp-stripe-monetization';
 * 
 * const config = createSubscriptionSetup({
 *   stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
 *   stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   plans: [
 *     {
 *       id: 'basic',
 *       name: 'Basic Plan',
 *       price: 1999, // $19.99/month
 *       interval: 'month',
 *       includedCalls: 1000,
 *       overagePrice: 50 // $0.50 per additional call
 *     },
 *     {
 *       id: 'pro',
 *       name: 'Pro Plan', 
 *       price: 4999, // $49.99/month
 *       interval: 'month',
 *       includedCalls: 5000,
 *       overagePrice: 25 // $0.25 per additional call
 *     }
 *   ]
 * });
 * 
 * const plugin = createStripeMonetizationPlugin(config);
 * ```
 */

/**
 * Credit system setup
 * 
 * @example
 * ```typescript
 * import { createStripeMonetizationPlugin, createCreditSystemSetup } from 'mcp-stripe-monetization';
 * 
 * const config = createCreditSystemSetup({
 *   stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
 *   stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   creditPackages: [
 *     { credits: 100, price: 999, name: 'Starter Pack' },
 *     { credits: 500, price: 3999, name: 'Power Pack' },
 *     { credits: 1000, price: 6999, name: 'Enterprise Pack' }
 *   ],
 *   toolPrices: {
 *     'expensive-ai-tool': 5, // 5 credits per call
 *     'basic-tool': 1,        // 1 credit per call
 *     'premium-analysis': 10   // 10 credits per call
 *   }
 * });
 * 
 * const plugin = createStripeMonetizationPlugin(config);
 * ```
 */

/**
 * Development setup with penny pricing
 * 
 * @example
 * ```typescript
 * import { createStripeMonetizationPlugin, createDevelopmentSetup } from 'mcp-stripe-monetization';
 * 
 * const config = createDevelopmentSetup({
 *   stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
 *   stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 * });
 * 
 * const plugin = createStripeMonetizationPlugin(config);
 * ```
 */
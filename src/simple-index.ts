/**
 * @file Simplified MCP Stripe Monetization Plugin
 * @version 1.0.0
 * 
 * A clean, backend-only Stripe monetization plugin that uses Stripe's native UI.
 * Perfect for developers who want to monetize MCP tools without building custom payment forms.
 */

// Core plugin and interfaces
export { StripeMonetizationPlugin } from './core/plugin.js';
export { StripeAPIEndpoints, createStripeRoutes } from './api/stripe-endpoints.js';

// Configuration types
export type {
  StripeMonetizationConfig,
  BillingModel
} from './interfaces/config.js';

// Billing types  
export type {
  BillingContext,
  PaymentResult,
  CustomerInfo
} from './interfaces/billing.js';

// Factory function
export { createStripeMonetizationPlugin } from './utils/factory.js';

// Simple configuration helpers
export function createBasicSetup(params: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
  defaultPrice: number;
  toolPrices?: Record<string, number>;
  volumeDiscounts?: Array<{ threshold: number; discountPercent: number }>;
}): StripeMonetizationConfig {
  return {
    enabled: true,
    billingModel: 'per-call',
    environment: 'development',
    stripe: {
      secretKey: params.stripeSecretKey,
      publishableKey: params.stripePublishableKey,
      webhookSecret: params.webhookSecret,
      apiVersion: '2023-10-16'
    },
    billing: {
      defaultPrice: params.defaultPrice,
      currency: 'usd',
      toolPrices: params.toolPrices || {},
      volumeDiscounts: params.volumeDiscounts || []
    },
    authentication: {
      type: 'api-key',
      required: true
    },
    database: {
      type: 'sqlite',
      path: './billing.db'
    }
  };
}

export function createDevelopmentSetup(params: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
}): StripeMonetizationConfig {
  return createBasicSetup({
    ...params,
    defaultPrice: 1, // $0.01 for testing
    toolPrices: {
      'test-tool': 1,
      'expensive-tool': 5,
      'free-tool': 0
    }
  });
}
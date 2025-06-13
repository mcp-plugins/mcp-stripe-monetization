/**
 * @file Factory function for creating Stripe monetization plugin instances
 * @version 1.0.0
 */

import type { StripeMonetizationConfig } from '../interfaces/config.js';
import { validateConfig } from './helpers.js';

/**
 * Create a new Stripe monetization plugin instance
 * 
 * @param config Plugin configuration
 * @returns Validated configuration object
 * 
 * @example
 * ```typescript
 * import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';
 * 
 * const config = createBasicSetup({
 *   stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
 *   stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   defaultPrice: 100
 * });
 * 
 * const validatedConfig = createStripeMonetizationPlugin(config);
 * ```
 */
export function createStripeMonetizationPlugin(config: StripeMonetizationConfig): StripeMonetizationConfig {
  // Validate configuration
  validateConfig(config);
  
  // Return validated config (plugin implementation will be added later)
  return config;
}
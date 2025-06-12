/**
 * @file Factory function for creating Stripe monetization plugin instances
 * @version 1.0.0
 */

import { StripeMonetizationPlugin } from '../core/plugin.js';
import type { StripeMonetizationConfig } from '../interfaces/config.js';
import { validateConfig } from './helpers.js';

/**
 * Create a new Stripe monetization plugin instance
 * 
 * @param config Plugin configuration
 * @returns Configured plugin instance
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
 * const plugin = createStripeMonetizationPlugin(config);
 * ```
 */
export function createStripeMonetizationPlugin(config: StripeMonetizationConfig): StripeMonetizationPlugin {
  // Validate configuration
  validateConfig(config);
  
  // Create and return plugin instance
  return new StripeMonetizationPlugin(config);
}
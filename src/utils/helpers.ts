/**
 * @file Helper utilities for easy plugin setup
 * @version 1.0.0
 */

import type { StripeMonetizationConfig, PerCallConfig, SubscriptionPlan } from '../interfaces/config.js';

/**
 * Basic setup for simple per-call billing
 */
export function createBasicSetup(options: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
  defaultPrice: number;
  toolPrices?: Record<string, number>;
  volumeDiscounts?: Array<{ threshold: number; discountPercent: number }>;
}): StripeMonetizationConfig {
  const billing: PerCallConfig = {
    defaultPrice: options.defaultPrice,
    ...(options.toolPrices && { toolPrices: options.toolPrices }),
    ...(options.volumeDiscounts && { volumeDiscounts: options.volumeDiscounts }),
    minimumCharge: 50 // $0.50 minimum
  };

  return {
    billingModel: 'per-call',
    stripe: {
      secretKey: options.stripeSecretKey,
      publishableKey: options.stripePublishableKey,
      webhookSecret: options.webhookSecret,
      apiVersion: '2023-10-16'
    },
    billing,
    authentication: {
      method: 'jwt',
      jwt: {
        secret: process.env.JWT_SECRET || 'default-development-secret',
        expiresIn: '7d'
      }
    },
    database: {
      type: 'sqlite',
      connection: './monetization.db',
      runMigrations: true
    },
    environment: 'development',
    debug: true
  };
}

/**
 * Subscription setup with multiple plans
 */
export function createSubscriptionSetup(options: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
  plans: SubscriptionPlan[];
  trialPeriodDays?: number;
}): StripeMonetizationConfig {
  return {
    billingModel: 'subscription',
    stripe: {
      secretKey: options.stripeSecretKey,
      publishableKey: options.stripePublishableKey,
      webhookSecret: options.webhookSecret,
      apiVersion: '2023-10-16'
    },
    billing: {
      plans: options.plans,
      allowPlanChanges: true,
      prorationBehavior: 'always_invoice',
      ...(options.trialPeriodDays !== undefined && { trialPeriodDays: options.trialPeriodDays })
    },
    authentication: {
      method: 'jwt',
      jwt: {
        secret: process.env.JWT_SECRET || 'default-development-secret',
        expiresIn: '7d'
      }
    },
    database: {
      type: 'sqlite',
      connection: './monetization.db',
      runMigrations: true
    },
    environment: 'development',
    debug: true
  };
}

/**
 * Usage-based billing setup
 */
export function createUsageBasedSetup(options: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
  meterId: string;
  tiers: Array<{ upTo: number | null; pricePerUnit: number }>;
}): StripeMonetizationConfig {
  return {
    billingModel: 'usage-based',
    stripe: {
      secretKey: options.stripeSecretKey,
      publishableKey: options.stripePublishableKey,
      webhookSecret: options.webhookSecret,
      apiVersion: '2023-10-16'
    },
    billing: {
      meterId: options.meterId,
      tiers: options.tiers,
      billingPeriod: 'month',
      aggregateUsage: true
    },
    authentication: {
      method: 'jwt',
      jwt: {
        secret: process.env.JWT_SECRET || 'default-development-secret',
        expiresIn: '7d'
      }
    },
    database: {
      type: 'sqlite',
      connection: './monetization.db',
      runMigrations: true
    },
    environment: 'development',
    debug: true
  };
}

/**
 * Freemium model setup
 */
export function createFreemiumSetup(options: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
  freeTier: { callsPerMonth: number; tools?: string[] };
  upgradeOptions: SubscriptionPlan[];
}): StripeMonetizationConfig {
  return {
    billingModel: 'freemium',
    stripe: {
      secretKey: options.stripeSecretKey,
      publishableKey: options.stripePublishableKey,
      webhookSecret: options.webhookSecret,
      apiVersion: '2023-10-16'
    },
    billing: {
      freeTier: options.freeTier,
      upgradeOptions: options.upgradeOptions,
      limitExceededBehavior: 'block'
    },
    authentication: {
      method: 'jwt',
      jwt: {
        secret: process.env.JWT_SECRET || 'default-development-secret',
        expiresIn: '7d'
      }
    },
    database: {
      type: 'sqlite',
      connection: './monetization.db',
      runMigrations: true
    },
    environment: 'development',
    debug: true
  };
}

/**
 * Credit system setup
 */
export function createCreditSystemSetup(options: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
  creditPackages: Array<{
    credits: number;
    price: number;
    name: string;
    bonusCredits?: number;
  }>;
  toolPrices: Record<string, number>;
}): StripeMonetizationConfig {
  return {
    billingModel: 'credit-system',
    stripe: {
      secretKey: options.stripeSecretKey,
      publishableKey: options.stripePublishableKey,
      webhookSecret: options.webhookSecret,
      apiVersion: '2023-10-16'
    },
    billing: {
      creditPackages: options.creditPackages,
      toolPrices: options.toolPrices,
      defaultCreditCost: 1
    },
    authentication: {
      method: 'jwt',
      jwt: {
        secret: process.env.JWT_SECRET || 'default-development-secret',
        expiresIn: '7d'
      }
    },
    database: {
      type: 'sqlite',
      connection: './monetization.db',
      runMigrations: true
    },
    environment: 'development',
    debug: true
  };
}

/**
 * Development setup with penny pricing for testing
 */
export function createDevelopmentSetup(options: {
  stripeSecretKey: string;
  stripePublishableKey: string;
  webhookSecret: string;
}): StripeMonetizationConfig {
  return createBasicSetup({
    stripeSecretKey: options.stripeSecretKey,
    stripePublishableKey: options.stripePublishableKey,
    webhookSecret: options.webhookSecret,
    defaultPrice: 1, // $0.01 for development
    toolPrices: {
      // All tools cost 1 cent in development
    }
  });
}

/**
 * Validate configuration object
 */
export function validateConfig(config: StripeMonetizationConfig): boolean {
  // Basic validation
  if (!config.stripe?.secretKey) {
    throw new Error('Stripe secret key is required');
  }
  
  if (!config.stripe?.publishableKey) {
    throw new Error('Stripe publishable key is required');
  }
  
  if (!config.stripe?.webhookSecret) {
    throw new Error('Stripe webhook secret is required');
  }
  
  if (!config.billingModel) {
    throw new Error('Billing model is required');
  }
  
  if (!config.authentication) {
    throw new Error('Authentication configuration is required');
  }
  
  if (!config.database) {
    throw new Error('Database configuration is required');
  }
  
  return true;
}
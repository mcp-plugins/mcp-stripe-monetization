/**
 * @file Configuration Validators
 * @version 1.0.0
 * @description Validation functions for configuration objects
 */

import {
  StripeConfig,
  DatabaseConfig,
  PricingConfig,
  BillingModel,
  DatabaseType,
} from '../interfaces/config.js';
import { ValidationError } from '../interfaces/errors.js';
import { validateEmail, validateCurrency, validateUrl } from './helpers.js';

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig(config: StripeConfig): ValidationError | null {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate secret key
  if (!config.secretKey) {
    errors.push({ field: 'secretKey', message: 'Secret key is required' });
  } else if (!config.secretKey.startsWith('sk_')) {
    errors.push({ field: 'secretKey', message: 'Invalid secret key format' });
  }

  // Validate publishable key
  if (!config.publishableKey) {
    errors.push({ field: 'publishableKey', message: 'Publishable key is required' });
  } else if (!config.publishableKey.startsWith('pk_')) {
    errors.push({ field: 'publishableKey', message: 'Invalid publishable key format' });
  }

  // Validate webhook secret
  if (!config.webhookSecret) {
    errors.push({ field: 'webhookSecret', message: 'Webhook secret is required' });
  } else if (!config.webhookSecret.startsWith('whsec_')) {
    errors.push({ field: 'webhookSecret', message: 'Invalid webhook secret format' });
  }

  // Validate mode consistency
  if (config.secretKey && config.publishableKey) {
    const secretKeyMode = config.secretKey.includes('_test_') ? 'test' : 'live';
    const publishableKeyMode = config.publishableKey.includes('_test_') ? 'test' : 'live';
    
    if (secretKeyMode !== publishableKeyMode) {
      errors.push({ 
        field: 'mode', 
        message: 'Secret key and publishable key must be from the same environment (test/live)' 
      });
    }
    
    if (config.mode && config.mode !== secretKeyMode) {
      errors.push({ 
        field: 'mode', 
        message: `Mode setting (${config.mode}) doesn't match key environment (${secretKeyMode})` 
      });
    }
  }

  // Validate API version format
  if (config.apiVersion) {
    const versionRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!versionRegex.test(config.apiVersion)) {
      errors.push({ 
        field: 'apiVersion', 
        message: 'API version must be in YYYY-MM-DD format' 
      });
    }
  }

  // Validate webhook endpoint URL
  if (config.webhookEndpoint && !validateUrl(config.webhookEndpoint)) {
    errors.push({ 
      field: 'webhookEndpoint', 
      message: 'Invalid webhook endpoint URL' 
    });
  }

  // Validate Connect configuration
  if (config.connect?.enabled) {
    if (config.connect.platformFeePercent !== undefined) {
      if (config.connect.platformFeePercent < 0 || config.connect.platformFeePercent > 100) {
        errors.push({ 
          field: 'connect.platformFeePercent', 
          message: 'Platform fee percentage must be between 0 and 100' 
        });
      }
    }
  }

  return errors.length > 0 ? new ValidationError('Stripe configuration validation failed', errors) : null;
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): ValidationError | null {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate database type
  const supportedTypes: DatabaseType[] = ['sqlite', 'postgresql', 'mysql'];
  if (!supportedTypes.includes(config.type)) {
    errors.push({ 
      field: 'type', 
      message: `Database type must be one of: ${supportedTypes.join(', ')}` 
    });
  }

  // Validate connection string
  if (!config.connectionString) {
    errors.push({ field: 'connectionString', message: 'Connection string is required' });
  } else {
    // Validate connection string format based on database type
    switch (config.type) {
      case 'sqlite':
        // SQLite can be a file path or :memory:
        if (config.connectionString !== ':memory:' && 
            !config.connectionString.endsWith('.db') && 
            !config.connectionString.endsWith('.sqlite') && 
            !config.connectionString.endsWith('.sqlite3')) {
          errors.push({ 
            field: 'connectionString', 
            message: 'SQLite connection string should be a .db, .sqlite, .sqlite3 file or ":memory:"' 
          });
        }
        break;
      case 'postgresql':
        if (!config.connectionString.startsWith('postgres://') && 
            !config.connectionString.startsWith('postgresql://')) {
          errors.push({ 
            field: 'connectionString', 
            message: 'PostgreSQL connection string must start with "postgres://" or "postgresql://"' 
          });
        }
        break;
      case 'mysql':
        if (!config.connectionString.startsWith('mysql://')) {
          errors.push({ 
            field: 'connectionString', 
            message: 'MySQL connection string must start with "mysql://"' 
          });
        }
        break;
    }
  }

  // Validate pool settings
  if (config.pool) {
    if (config.pool.min !== undefined && config.pool.min < 0) {
      errors.push({ field: 'pool.min', message: 'Pool minimum must be non-negative' });
    }
    
    if (config.pool.max !== undefined && config.pool.max < 1) {
      errors.push({ field: 'pool.max', message: 'Pool maximum must be at least 1' });
    }
    
    if (config.pool.min !== undefined && config.pool.max !== undefined && 
        config.pool.min > config.pool.max) {
      errors.push({ field: 'pool', message: 'Pool minimum cannot be greater than maximum' });
    }
    
    if (config.pool.acquire !== undefined && config.pool.acquire < 1000) {
      errors.push({ field: 'pool.acquire', message: 'Pool acquire timeout must be at least 1000ms' });
    }
    
    if (config.pool.idle !== undefined && config.pool.idle < 1000) {
      errors.push({ field: 'pool.idle', message: 'Pool idle timeout must be at least 1000ms' });
    }
  }

  // Validate table prefix
  if (config.tablePrefix && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.tablePrefix)) {
    errors.push({ 
      field: 'tablePrefix', 
      message: 'Table prefix must contain only letters, numbers, and underscores, and start with a letter or underscore' 
    });
  }

  // Validate backup settings
  if (config.backup?.enabled) {
    if (config.backup.schedule && !isValidCronExpression(config.backup.schedule)) {
      errors.push({ 
        field: 'backup.schedule', 
        message: 'Invalid cron expression for backup schedule' 
      });
    }
    
    if (config.backup.retention !== undefined && config.backup.retention < 1) {
      errors.push({ 
        field: 'backup.retention', 
        message: 'Backup retention must be at least 1 day' 
      });
    }
  }

  return errors.length > 0 ? new ValidationError('Database configuration validation failed', errors) : null;
}

/**
 * Validate pricing configuration
 */
export function validatePricingConfig(config: PricingConfig, billingModel: BillingModel): ValidationError | null {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate currency
  if (!config.currency) {
    errors.push({ field: 'currency', message: 'Currency is required' });
  } else if (!validateCurrency(config.currency)) {
    errors.push({ field: 'currency', message: 'Invalid or unsupported currency code' });
  }

  // Validate tax settings
  if (config.tax?.enabled) {
    if (config.tax.defaultRate !== undefined) {
      if (config.tax.defaultRate < 0 || config.tax.defaultRate > 1) {
        errors.push({ 
          field: 'tax.defaultRate', 
          message: 'Tax rate must be between 0 and 1 (0% to 100%)' 
        });
      }
    }
  }

  // Validate billing model specific configuration
  switch (billingModel) {
    case 'per_call':
      if (!config.perCall) {
        errors.push({ field: 'perCall', message: 'Per-call pricing configuration is required' });
      } else {
        const perCallErrors = validatePerCallPricing(config.perCall);
        errors.push(...perCallErrors);
      }
      break;
      
    case 'subscription':
      if (!config.subscription) {
        errors.push({ field: 'subscription', message: 'Subscription pricing configuration is required' });
      } else {
        const subscriptionErrors = validateSubscriptionPricing(config.subscription);
        errors.push(...subscriptionErrors);
      }
      break;
      
    case 'usage_based':
      if (!config.usageBased) {
        errors.push({ field: 'usageBased', message: 'Usage-based pricing configuration is required' });
      } else {
        const usageErrors = validateUsageBasedPricing(config.usageBased);
        errors.push(...usageErrors);
      }
      break;
      
    case 'freemium':
      if (!config.freemium) {
        errors.push({ field: 'freemium', message: 'Freemium pricing configuration is required' });
      } else {
        const freemiumErrors = validateFreemiumPricing(config.freemium);
        errors.push(...freemiumErrors);
      }
      break;
      
    case 'credit_system':
      if (!config.creditSystem) {
        errors.push({ field: 'creditSystem', message: 'Credit system pricing configuration is required' });
      } else {
        const creditErrors = validateCreditSystemPricing(config.creditSystem);
        errors.push(...creditErrors);
      }
      break;
  }

  return errors.length > 0 ? new ValidationError('Pricing configuration validation failed', errors) : null;
}

/**
 * Validate billing model
 */
export function validateBillingModel(model: string): model is BillingModel {
  const supportedModels: BillingModel[] = ['per_call', 'subscription', 'usage_based', 'freemium', 'credit_system'];
  return supportedModels.includes(model as BillingModel);
}

// Helper validation functions

function validatePerCallPricing(config: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  if (config.defaultPrice === undefined || config.defaultPrice < 0) {
    errors.push({ field: 'perCall.defaultPrice', message: 'Default price must be non-negative' });
  }

  if (config.minimumCharge !== undefined && config.minimumCharge < 0) {
    errors.push({ field: 'perCall.minimumCharge', message: 'Minimum charge must be non-negative' });
  }

  if (config.toolPricing) {
    for (const [tool, price] of Object.entries(config.toolPricing)) {
      if (typeof price !== 'number' || price < 0) {
        errors.push({ 
          field: `perCall.toolPricing.${tool}`, 
          message: 'Tool pricing must be a non-negative number' 
        });
      }
    }
  }

  if (config.bulkTiers) {
    config.bulkTiers.forEach((tier: any, index: number) => {
      if (!tier.minCalls || tier.minCalls < 1) {
        errors.push({ 
          field: `perCall.bulkTiers[${index}].minCalls`, 
          message: 'Minimum calls must be at least 1' 
        });
      }
      if (tier.pricePerCall === undefined || tier.pricePerCall < 0) {
        errors.push({ 
          field: `perCall.bulkTiers[${index}].pricePerCall`, 
          message: 'Price per call must be non-negative' 
        });
      }
    });
  }

  return errors;
}

function validateSubscriptionPricing(config: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  if (!config.plans || !Array.isArray(config.plans) || config.plans.length === 0) {
    errors.push({ field: 'subscription.plans', message: 'At least one subscription plan is required' });
  } else {
    config.plans.forEach((plan: any, index: number) => {
      if (!plan.id) {
        errors.push({ field: `subscription.plans[${index}].id`, message: 'Plan ID is required' });
      }
      if (!plan.name) {
        errors.push({ field: `subscription.plans[${index}].name`, message: 'Plan name is required' });
      }
      if (!plan.priceId) {
        errors.push({ field: `subscription.plans[${index}].priceId`, message: 'Stripe price ID is required' });
      }
      if (!plan.interval || !['day', 'week', 'month', 'year'].includes(plan.interval)) {
        errors.push({ 
          field: `subscription.plans[${index}].interval`, 
          message: 'Plan interval must be day, week, month, or year' 
        });
      }
      if (plan.amount === undefined || plan.amount < 0) {
        errors.push({ 
          field: `subscription.plans[${index}].amount`, 
          message: 'Plan amount must be non-negative' 
        });
      }
      if (plan.callsIncluded === undefined || plan.callsIncluded < 0) {
        errors.push({ 
          field: `subscription.plans[${index}].callsIncluded`, 
          message: 'Calls included must be non-negative' 
        });
      }
      if (plan.overageRate !== undefined && plan.overageRate < 0) {
        errors.push({ 
          field: `subscription.plans[${index}].overageRate`, 
          message: 'Overage rate must be non-negative' 
        });
      }
    });
  }

  if (config.trialPeriod?.enabled) {
    if (config.trialPeriod.days === undefined || config.trialPeriod.days < 1) {
      errors.push({ 
        field: 'subscription.trialPeriod.days', 
        message: 'Trial period must be at least 1 day' 
      });
    }
    if (config.trialPeriod.callsIncluded !== undefined && config.trialPeriod.callsIncluded < 0) {
      errors.push({ 
        field: 'subscription.trialPeriod.callsIncluded', 
        message: 'Trial calls included must be non-negative' 
      });
    }
  }

  return errors;
}

function validateUsageBasedPricing(config: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  if (config.pricePerUnit === undefined || config.pricePerUnit < 0) {
    errors.push({ field: 'usageBased.pricePerUnit', message: 'Price per unit must be non-negative' });
  }

  if (config.minimumCharge !== undefined && config.minimumCharge < 0) {
    errors.push({ field: 'usageBased.minimumCharge', message: 'Minimum charge must be non-negative' });
  }

  if (config.maximumCharge !== undefined && config.maximumCharge < 0) {
    errors.push({ field: 'usageBased.maximumCharge', message: 'Maximum charge must be non-negative' });
  }

  if (config.minimumCharge !== undefined && config.maximumCharge !== undefined && 
      config.minimumCharge > config.maximumCharge) {
    errors.push({ 
      field: 'usageBased', 
      message: 'Minimum charge cannot be greater than maximum charge' 
    });
  }

  if (config.tiers) {
    config.tiers.forEach((tier: any, index: number) => {
      if (tier.upTo !== 'inf' && (typeof tier.upTo !== 'number' || tier.upTo < 0)) {
        errors.push({ 
          field: `usageBased.tiers[${index}].upTo`, 
          message: 'Tier limit must be a non-negative number or "inf"' 
        });
      }
      if (tier.unitAmount === undefined || tier.unitAmount < 0) {
        errors.push({ 
          field: `usageBased.tiers[${index}].unitAmount`, 
          message: 'Unit amount must be non-negative' 
        });
      }
      if (tier.flatAmount !== undefined && tier.flatAmount < 0) {
        errors.push({ 
          field: `usageBased.tiers[${index}].flatAmount`, 
          message: 'Flat amount must be non-negative' 
        });
      }
    });
  }

  return errors;
}

function validateFreemiumPricing(config: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  if (!config.freeTierLimits) {
    errors.push({ field: 'freemium.freeTierLimits', message: 'Free tier limits are required' });
  } else {
    if (config.freeTierLimits.callsPerMonth === undefined || config.freeTierLimits.callsPerMonth < 0) {
      errors.push({ 
        field: 'freemium.freeTierLimits.callsPerMonth', 
        message: 'Calls per month must be non-negative' 
      });
    }
    if (config.freeTierLimits.callsPerDay !== undefined && config.freeTierLimits.callsPerDay < 0) {
      errors.push({ 
        field: 'freemium.freeTierLimits.callsPerDay', 
        message: 'Calls per day must be non-negative' 
      });
    }
    if (config.freeTierLimits.callsPerHour !== undefined && config.freeTierLimits.callsPerHour < 0) {
      errors.push({ 
        field: 'freemium.freeTierLimits.callsPerHour', 
        message: 'Calls per hour must be non-negative' 
      });
    }
  }

  if (!config.overageBehavior || !['block', 'upgrade_prompt', 'charge'].includes(config.overageBehavior)) {
    errors.push({ 
      field: 'freemium.overageBehavior', 
      message: 'Overage behavior must be block, upgrade_prompt, or charge' 
    });
  }

  if (config.gracePeriod?.enabled) {
    if (config.gracePeriod.hours === undefined || config.gracePeriod.hours < 1) {
      errors.push({ 
        field: 'freemium.gracePeriod.hours', 
        message: 'Grace period must be at least 1 hour' 
      });
    }
    if (config.gracePeriod.additionalCalls === undefined || config.gracePeriod.additionalCalls < 0) {
      errors.push({ 
        field: 'freemium.gracePeriod.additionalCalls', 
        message: 'Additional calls must be non-negative' 
      });
    }
  }

  return errors;
}

function validateCreditSystemPricing(config: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  if (config.creditsPerCall === undefined || config.creditsPerCall < 1) {
    errors.push({ 
      field: 'creditSystem.creditsPerCall', 
      message: 'Credits per call must be at least 1' 
    });
  }

  if (config.toolCredits) {
    for (const [tool, credits] of Object.entries(config.toolCredits)) {
      if (typeof credits !== 'number' || credits < 1) {
        errors.push({ 
          field: `creditSystem.toolCredits.${tool}`, 
          message: 'Tool credits must be at least 1' 
        });
      }
    }
  }

  if (!config.creditPackages || !Array.isArray(config.creditPackages) || config.creditPackages.length === 0) {
    errors.push({ 
      field: 'creditSystem.creditPackages', 
      message: 'At least one credit package is required' 
    });
  } else {
    config.creditPackages.forEach((pkg: any, index: number) => {
      if (!pkg.id) {
        errors.push({ 
          field: `creditSystem.creditPackages[${index}].id`, 
          message: 'Package ID is required' 
        });
      }
      if (pkg.credits === undefined || pkg.credits < 1) {
        errors.push({ 
          field: `creditSystem.creditPackages[${index}].credits`, 
          message: 'Package credits must be at least 1' 
        });
      }
      if (pkg.price === undefined || pkg.price < 0) {
        errors.push({ 
          field: `creditSystem.creditPackages[${index}].price`, 
          message: 'Package price must be non-negative' 
        });
      }
      if (pkg.bonus !== undefined && pkg.bonus < 0) {
        errors.push({ 
          field: `creditSystem.creditPackages[${index}].bonus`, 
          message: 'Bonus credits must be non-negative' 
        });
      }
    });
  }

  if (config.expiration?.enabled) {
    if (config.expiration.days === undefined || config.expiration.days < 1) {
      errors.push({ 
        field: 'creditSystem.expiration.days', 
        message: 'Credit expiration must be at least 1 day' 
      });
    }
    if (config.expiration.warningDays !== undefined && config.expiration.warningDays < 1) {
      errors.push({ 
        field: 'creditSystem.expiration.warningDays', 
        message: 'Warning days must be at least 1' 
      });
    }
  }

  return errors;
}

function isValidCronExpression(cron: string): boolean {
  // Basic cron validation - 5 or 6 fields
  const parts = cron.trim().split(/\s+/);
  return parts.length === 5 || parts.length === 6;
}
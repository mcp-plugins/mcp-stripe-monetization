/**
 * @file Main Package Export Tests
 * @version 1.0.0
 * @description Tests for the main package exports and API surface
 */

import {
  createStripeMonetizationPlugin,
  createBasicSetup,
  createDevelopmentSetup,
  createSubscriptionSetup,
  createCreditSystemSetup,
  loadAndValidateConfig,
  StripeMonetizationPlugin,
  MonetizationError,
  PaymentRequiredError,
  InsufficientCreditsError,
  ValidationError,
  formatAmount,
  validateEmail,
  generateApiKey,
  VERSION,
  FEATURES,
  BILLING_MODELS,
  SUPPORTED_CURRENCIES,
} from '../../src/index.js';

describe('Package Exports', () => {
  describe('Main Plugin Export', () => {
    test('should export StripeMonetizationPlugin class', () => {
      expect(StripeMonetizationPlugin).toBeDefined();
      expect(typeof StripeMonetizationPlugin).toBe('function');
    });

    test('should export createStripeMonetizationPlugin factory function', () => {
      expect(createStripeMonetizationPlugin).toBeDefined();
      expect(typeof createStripeMonetizationPlugin).toBe('function');
    });
  });

  describe('Configuration Helpers', () => {
    test('should export configuration setup helpers', () => {
      expect(createBasicSetup).toBeDefined();
      expect(createDevelopmentSetup).toBeDefined();
      expect(createSubscriptionSetup).toBeDefined();
      expect(createCreditSystemSetup).toBeDefined();
      expect(loadAndValidateConfig).toBeDefined();
    });

    test('should create basic setup configuration', () => {
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_123',
        stripePublishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
        defaultPrice: 100,
      });

      expect(config).toBeDefined();
      expect(config.billingModel).toBe('per_call');
      expect(config.stripe.secretKey).toBe('sk_test_123');
      expect(config.pricing.perCall?.defaultPrice).toBe(100);
    });

    test('should create development setup with debug enabled', () => {
      const config = createDevelopmentSetup({
        stripeSecretKey: 'sk_test_123',
        stripePublishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
      });

      expect(config.debug).toBe(true);
      expect(config.pricing.perCall?.defaultPrice).toBe(1);
      expect(config.enableManagementApi).toBe(true);
    });

    test('should create subscription setup with plans', () => {
      const config = createSubscriptionSetup({
        stripeSecretKey: 'sk_test_123',
        stripePublishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
        plans: [
          {
            id: 'starter',
            name: 'Starter Plan',
            priceId: 'price_123',
            amount: 2900,
            callsIncluded: 1000,
          },
        ],
      });

      expect(config.billingModel).toBe('subscription');
      expect(config.pricing.subscription?.plans).toHaveLength(1);
      expect(config.pricing.subscription?.plans[0].id).toBe('starter');
    });

    test('should create credit system setup', () => {
      const config = createCreditSystemSetup({
        stripeSecretKey: 'sk_test_123',
        stripePublishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
        creditPackages: [
          {
            id: 'small',
            credits: 100,
            price: 1000,
          },
        ],
      });

      expect(config.billingModel).toBe('credit_system');
      expect(config.pricing.creditSystem?.creditPackages).toHaveLength(1);
    });
  });

  describe('Error Classes', () => {
    test('should export custom error classes', () => {
      expect(MonetizationError).toBeDefined();
      expect(PaymentRequiredError).toBeDefined();
      expect(InsufficientCreditsError).toBeDefined();
      expect(ValidationError).toBeDefined();
    });

    test('should create MonetizationError instances', () => {
      const error = new MonetizationError('Test error', 'TEST_CODE', 400);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MonetizationError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
    });

    test('should create PaymentRequiredError instances', () => {
      const error = new PaymentRequiredError('Payment required');
      
      expect(error).toBeInstanceOf(MonetizationError);
      expect(error.statusCode).toBe(402);
      expect(error.code).toBe('PAYMENT_REQUIRED');
    });

    test('should create ValidationError with field details', () => {
      const fields = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'amount', message: 'Amount must be positive' },
      ];
      const error = new ValidationError('Validation failed', fields);
      
      expect(error).toBeInstanceOf(MonetizationError);
      expect(error.fields).toEqual(fields);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('Utility Functions', () => {
    test('should export utility functions', () => {
      expect(formatAmount).toBeDefined();
      expect(validateEmail).toBeDefined();
      expect(generateApiKey).toBeDefined();
    });

    test('should format amounts correctly', () => {
      expect(formatAmount(100, 'usd')).toBe('$1.00');
      expect(formatAmount(2500, 'usd')).toBe('$25.00');
      expect(formatAmount(99, 'usd')).toBe('$0.99');
    });

    test('should validate email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });

    test('should generate API keys with prefix', () => {
      const apiKey = generateApiKey('test', 16);
      
      expect(apiKey).toMatch(/^test_[a-f0-9]{32}$/);
      expect(apiKey.length).toBe(4 + 1 + 32); // prefix + underscore + hex
    });
  });

  describe('Constants and Enums', () => {
    test('should export version information', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should export feature flags', () => {
      expect(FEATURES).toBeDefined();
      expect(typeof FEATURES).toBe('object');
      expect(FEATURES.MULTI_DATABASE).toBe(true);
      expect(FEATURES.REAL_TIME_ANALYTICS).toBe(true);
    });

    test('should export billing models', () => {
      expect(BILLING_MODELS).toBeDefined();
      expect(Array.isArray(BILLING_MODELS)).toBe(true);
      expect(BILLING_MODELS).toContain('per_call');
      expect(BILLING_MODELS).toContain('subscription');
      expect(BILLING_MODELS).toContain('credit_system');
    });

    test('should export supported currencies', () => {
      expect(SUPPORTED_CURRENCIES).toBeDefined();
      expect(Array.isArray(SUPPORTED_CURRENCIES)).toBe(true);
      expect(SUPPORTED_CURRENCIES).toContain('usd');
      expect(SUPPORTED_CURRENCIES).toContain('eur');
      expect(SUPPORTED_CURRENCIES).toContain('gbp');
    });
  });

  describe('Plugin Creation', () => {
    test('should create plugin instance with minimal config', () => {
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_123',
        stripePublishableKey: 'pk_test_123',
        webhookSecret: 'whsec_123',
      });

      const plugin = createStripeMonetizationPlugin(config);
      
      expect(plugin).toBeInstanceOf(StripeMonetizationPlugin);
      expect(plugin.name).toBe('stripe-monetization-plugin');
      expect(plugin.version).toBe('1.0.0');
    });

    test('should validate configuration during plugin creation', () => {
      const invalidConfig = {
        billingModel: 'per_call' as const,
        stripe: {
          secretKey: '', // Invalid: empty secret key
          publishableKey: 'pk_test_123',
          webhookSecret: 'whsec_123',
        },
        database: {
          type: 'sqlite' as const,
          connectionString: './test.db',
        },
        auth: {
          jwtSecret: 'test-secret',
        },
        pricing: {
          currency: 'usd',
        },
      };

      expect(() => createStripeMonetizationPlugin(invalidConfig)).toThrow(ValidationError);
    });
  });

  describe('Type Guards', () => {
    test('should provide working type guards', () => {
      const { isBillingModel, isDatabaseType, isSupportedCurrency } = require('../../src/index.js');
      
      expect(isBillingModel('per_call')).toBe(true);
      expect(isBillingModel('invalid')).toBe(false);
      
      expect(isDatabaseType('sqlite')).toBe(true);
      expect(isDatabaseType('invalid')).toBe(false);
      
      expect(isSupportedCurrency('usd')).toBe(true);
      expect(isSupportedCurrency('invalid')).toBe(false);
    });
  });
});

describe('Plugin Metadata', () => {
  test('should have correct plugin metadata', () => {
    const config = createBasicSetup({
      stripeSecretKey: 'sk_test_123',
      stripePublishableKey: 'pk_test_123',
      webhookSecret: 'whsec_123',
    });

    const plugin = createStripeMonetizationPlugin(config);
    
    expect(plugin.metadata).toBeDefined();
    expect(plugin.metadata?.description).toContain('Stripe');
    expect(plugin.metadata?.tags).toContain('stripe');
    expect(plugin.metadata?.tags).toContain('monetization');
    expect(plugin.metadata?.author).toBe('Dennison Bertram');
  });
});
/**
 * Jest test setup file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_secret';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';

// Mock Stripe for testing
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test123', email: 'test@example.com' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      list: jest.fn().mockResolvedValue({ data: [] })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ 
        id: 'pi_test123', 
        status: 'succeeded',
        amount: 100,
        currency: 'usd'
      }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'succeeded' }),
      confirm: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'succeeded' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ 
        id: 'sub_test123', 
        status: 'active',
        current_period_end: Date.now() / 1000 + 86400 * 30
      }),
      retrieve: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      update: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      cancel: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'canceled' })
    },
    products: {
      create: jest.fn().mockResolvedValue({ id: 'prod_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'prod_test123' })
    },
    prices: {
      create: jest.fn().mockResolvedValue({ id: 'price_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'price_test123' })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            status: 'succeeded'
          }
        }
      })
    },
    billing: {
      meters: {
        create: jest.fn().mockResolvedValue({ id: 'mtr_test123' }),
        deactivate: jest.fn().mockResolvedValue({ id: 'mtr_test123' })
      },
      meterEvents: {
        create: jest.fn().mockResolvedValue({ id: 'mtre_test123' })
      }
    }
  }));
});

// Mock database connections
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn().mockReturnValue([])
    }),
    exec: jest.fn(),
    close: jest.fn(),
    pragma: jest.fn()
  }));
});

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    }),
    end: jest.fn(),
    query: jest.fn().mockResolvedValue({ rows: [] })
  }))
}));

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn().mockReturnValue({
    getConnection: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue([[]]),
      release: jest.fn()
    }),
    execute: jest.fn().mockResolvedValue([[]]),
    end: jest.fn()
  })
}));

// Global test utilities
global.testUtils = {
  createMockContext: () => ({
    toolName: 'test-tool',
    args: { test: true },
    metadata: {
      requestId: 'test-request-123',
      timestamp: new Date().toISOString()
    }
  }),

  createMockStripeConfig: () => ({
    secretKey: 'sk_test_mock_key',
    publishableKey: 'pk_test_mock_key',
    webhookSecret: 'whsec_test_mock_secret',
    apiVersion: '2023-10-16'
  }),

  createMockDatabaseConfig: () => ({
    type: 'sqlite' as const,
    connection: ':memory:',
    runMigrations: false
  }),

  createMockAuthConfig: () => ({
    method: 'jwt' as const,
    jwt: {
      secret: 'test_jwt_secret',
      expiresIn: '1h'
    }
  }),

  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Extend Jest matchers for better testing
expect.extend({
  toBeValidStripeAmount(received: number) {
    const pass = Number.isInteger(received) && received >= 50; // Minimum $0.50
    return {
      message: () => `expected ${received} to be a valid Stripe amount (integer >= 50 cents)`,
      pass
    };
  },

  toBeValidTimestamp(received: any) {
    const pass = typeof received === 'string' && !isNaN(Date.parse(received));
    return {
      message: () => `expected ${received} to be a valid ISO timestamp`,
      pass
    };
  }
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidStripeAmount(): R;
      toBeValidTimestamp(): R;
    }
  }

  var testUtils: {
    createMockContext: () => any;
    createMockStripeConfig: () => any;
    createMockDatabaseConfig: () => any;
    createMockAuthConfig: () => any;
    sleep: (ms: number) => Promise<void>;
  };
}
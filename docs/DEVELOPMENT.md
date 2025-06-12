# Development Guide - MCP Stripe Monetization Plugin

This guide covers how to develop, test, and integrate the MCP Stripe Monetization Plugin with the MCP proxy wrapper system.

## 🏗️ Architecture Overview

The plugin is designed as a standalone NPM package that integrates with the MCP proxy wrapper system through the plugin interface.

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              MCP Proxy Wrapper                          │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │         Stripe Monetization Plugin                  │ │ │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │ │ │
│  │  │  │ Auth System │ │Billing Logic│ │  Analytics  │   │ │ │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘   │ │ │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │ │ │
│  │  │  │  Database   │ │Stripe API   │ │  Security   │   │ │ │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      ┌─────────────────┐
                      │   Stripe API    │
                      └─────────────────┘
```

## 🚀 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to Stripe test account
- MCP proxy wrapper package

### Initial Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd mcp-stripe-monetization
   npm install
   ```

2. **Link with MCP Proxy Wrapper**
   ```bash
   # In mcp-stripe-monetization directory
   npm link
   
   # In mcp-proxy-wrapper directory  
   npm link mcp-stripe-monetization
   
   # Or in your MCP server project
   npm link mcp-stripe-monetization
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Stripe test keys
   ```

   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Development Settings
   NODE_ENV=development
   DEBUG=true
   
   # Database (for testing)
   DATABASE_URL=sqlite::memory:
   
   # Authentication
   JWT_SECRET=your-jwt-secret-for-development
   ```

### Build System

```bash
# Build TypeScript to ESM
npm run build:esm

# Build CommonJS version
npm run build:cjs

# Build both
npm run build

# Watch mode for development
npm run dev
```

## 🧪 Testing Strategy

### Test Structure

```
tests/
├── setup.ts                    # Jest configuration and mocks
├── integration.test.ts         # Integration tests with MCP proxy wrapper
├── unit/
│   ├── config.test.ts          # Configuration validation tests
│   ├── billing.test.ts         # Billing logic tests
│   ├── auth.test.ts            # Authentication tests
│   └── database.test.ts        # Database operation tests
└── e2e/
    ├── subscription.test.ts    # End-to-end subscription flow
    ├── payment.test.ts         # End-to-end payment flow
    └── analytics.test.ts       # Analytics and reporting tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- integration.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="billing"
```

### Testing with Real MCP Communication

The integration tests use actual MCP Client-Server communication:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { createStripeMonetizationPlugin } from '../src/index.js';

// Real MCP server and client
const server = new McpServer({ name: 'Test Server', version: '1.0.0' });
const client = new Client({ name: 'Test Client', version: '1.0.0' }, { capabilities: {} });

// Real transport layer
const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();

// Real plugin integration
const plugin = createStripeMonetizationPlugin(config);
const proxiedServer = await wrapWithProxy(server, { plugins: [plugin] });

// Connect through real MCP protocol
await proxiedServer.connect(serverTransport);
await client.connect(clientTransport);

// Test actual tool calls through MCP
const result = await client.callTool({
  name: 'test-tool',
  arguments: { test: true }
});
```

### Mock vs Real Testing

**Unit Tests**: Use mocks for fast, isolated testing
```typescript
// Mock Stripe API
jest.mock('stripe', () => ({
  // Mock implementation
}));

// Test billing logic
const result = await billingService.processPayment(mockContext);
```

**Integration Tests**: Use real MCP protocol with mocked external services
```typescript
// Real MCP communication, mocked Stripe
const result = await client.callTool({ name: 'tool', arguments: {} });
expect(result._meta.billed).toBe(true);
```

**E2E Tests**: Use Stripe test mode for complete flows
```typescript
// Real Stripe test API
const config = createBasicSetup({
  stripeSecretKey: 'sk_test_real_key',
  // ... real test configuration
});
```

## 🔌 Integration Patterns

### Basic Integration

```typescript
import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';

const config = createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 100
});

const plugin = createStripeMonetizationPlugin(config);
const proxiedServer = await wrapWithProxy(server, {
  plugins: [plugin]
});
```

### Advanced Integration

```typescript
import { createStripeMonetizationPlugin } from 'mcp-stripe-monetization';
import type { StripeMonetizationConfig } from 'mcp-stripe-monetization';

const config: StripeMonetizationConfig = {
  billingModel: 'subscription',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  billing: {
    plans: [
      {
        id: 'basic',
        name: 'Basic Plan',
        price: 1999,
        interval: 'month',
        includedCalls: 1000,
        overagePrice: 50
      }
    ],
    allowPlanChanges: true,
    prorationBehavior: 'always_invoice',
    trialPeriodDays: 14
  },
  authentication: {
    method: 'jwt',
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: '7d'
    }
  },
  database: {
    type: 'postgresql',
    connection: process.env.DATABASE_URL!,
    runMigrations: true
  },
  environment: 'production'
};

const plugin = createStripeMonetizationPlugin(config);
```

### Error Handling Integration

```typescript
import { PaymentError, RateLimitError } from 'mcp-stripe-monetization';

const proxiedServer = await wrapWithProxy(server, {
  plugins: [plugin],
  hooks: {
    afterToolCall: async (context, result) => {
      // Handle billing errors
      if (result.isError && result.error instanceof PaymentError) {
        return {
          ...result,
          content: [{
            type: 'text',
            text: 'Payment failed. Please check your payment method.'
          }]
        };
      }
      return result;
    }
  }
});
```

## 🔄 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-billing-model

# Install dependencies
npm install

# Start development server with watch mode
npm run dev

# Run tests continuously
npm run test:watch
```

### 2. Testing Changes

```bash
# Test against MCP proxy wrapper
cd ../mcp-proxy-wrapper
npm test

# Test integration
cd ../mcp-stripe-monetization
npm test -- integration.test.ts

# Test with real MCP server
npm run test:e2e
```

### 3. Building and Publishing

```bash
# Build the package
npm run build

# Test the built package
npm pack
npm install ./mcp-stripe-monetization-1.0.0.tgz

# Run pre-publish checks
npm run prepublishOnly

# Publish to NPM
npm publish
```

## 🐛 Debugging

### Debug Configuration

```typescript
const config = createBasicSetup({
  // ... other config
  debug: true, // Enable detailed logging
  environment: 'development'
});
```

### Logging

```typescript
// Enable debug logs
process.env.DEBUG = 'mcp-stripe:*';

// Plugin provides structured logging
plugin.on('debug', (event) => {
  console.log('[DEBUG]', event);
});

plugin.on('billing:attempt', (event) => {
  console.log('[BILLING]', event);
});
```

### Common Issues

1. **Plugin not loading**
   ```bash
   # Check peer dependencies
   npm ls mcp-proxy-wrapper
   
   # Verify plugin registration
   npm test -- --testNamePattern="plugin registration"
   ```

2. **Stripe API errors**
   ```typescript
   // Enable Stripe debug mode
   const stripe = new Stripe(secretKey, {
     apiVersion: '2023-10-16',
     typescript: true,
     telemetry: false
   });
   
   stripe.on('request', (request) => {
     console.log('[STRIPE REQUEST]', request);
   });
   ```

3. **Database connection issues**
   ```bash
   # Test database connection
   npm run migrate
   
   # Check connection string
   echo $DATABASE_URL
   ```

## 📦 Package Management

### Peer Dependencies

The plugin requires these peer dependencies to be installed in the consuming project:

```json
{
  "peerDependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "mcp-proxy-wrapper": "^1.0.0"
  }
}
```

### Version Compatibility

| Plugin Version | MCP Proxy Wrapper | MCP SDK |
|----------------|-------------------|---------|
| 1.0.x          | ^1.0.0           | ^0.4.0  |
| 1.1.x          | ^1.0.0           | ^0.4.0  |
| 2.0.x          | ^2.0.0           | ^0.5.0  |

### Dependency Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update peer dependencies in consuming projects
cd ../my-mcp-server
npm update mcp-proxy-wrapper @modelcontextprotocol/sdk
```

## 🚢 Production Deployment

### Build Optimization

```bash
# Production build
NODE_ENV=production npm run build

# Bundle analysis
npm run analyze

# Test production build
npm run test:prod
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
JWT_SECRET=production-jwt-secret
```

### Health Monitoring

```typescript
// Monitor plugin health
plugin.on('health:check', (status) => {
  if (!status.healthy) {
    // Alert monitoring system
    console.error('Plugin health check failed:', status);
  }
});

// Metrics collection
plugin.on('metrics:update', (metrics) => {
  // Send to monitoring service
  metricsService.record(metrics);
});
```

## 🤝 Contributing

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Commit Guidelines

```bash
# Use conventional commits
git commit -m "feat: add subscription billing model"
git commit -m "fix: resolve payment processing timeout"
git commit -m "docs: update integration examples"
```

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run full test suite
4. Update documentation
5. Submit PR with detailed description

### Release Process

```bash
# Update version
npm version patch|minor|major

# Create release notes
git tag -a v1.0.0 -m "Release v1.0.0"

# Push changes
git push origin main --tags

# Publish to NPM
npm publish
```

This development guide ensures you can effectively develop, test, and integrate the Stripe monetization plugin with the MCP proxy wrapper system.
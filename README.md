# MCP Stripe Monetization Plugin

> **🚧 WORK IN PROGRESS**  
> This package is currently under active development and has TypeScript compilation errors.  
> The [MCP Proxy Wrapper](https://www.npmjs.com/package/mcp-proxy-wrapper) is production-ready and published to NPM.  
> This Stripe monetization plugin will be completed and published soon.

A comprehensive Stripe monetization plugin for MCP (Model Context Protocol) servers. Transform your AI tools into revenue-generating services with multiple billing models, enterprise security, and real-time analytics.

**✨ Uses Stripe's native UI - no custom frontend needed!**

## 🚀 Quick Start

### Installation

```bash
npm install mcp-stripe-monetization
```

## 📖 How to Use

The plugin works in **two parts**:

1. **Backend**: Add the plugin to your MCP server to handle billing logic
2. **Frontend**: Use Stripe's hosted payment pages (no custom UI required)

## 🏗️ Step-by-Step Integration

### Step 0: Prerequisites

1. **Get Stripe API Keys**
   - Sign up at [stripe.com](https://stripe.com)
   - Get your API keys from the Stripe Dashboard
   - For testing, use the test keys (they start with `pk_test_` and `sk_test_`)

2. **Set Environment Variables**
   ```bash
   # .env file
   STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

3. **Install Dependencies**
   ```bash
   npm install mcp-stripe-monetization mcp-proxy-wrapper
   ```

### Step 1: Setup Your MCP Server (Backend)

Add the monetization plugin to your existing MCP server:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';

// 1. Create your MCP server as usual
const server = new McpServer({
  name: 'My Monetized AI Tools',
  version: '1.0.0'
});

// 2. Configure Stripe monetization
const config = createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 100, // $1.00 per call
  toolPrices: {
    'ai-analysis': 250,     // $2.50 per call
    'data-processing': 150, // $1.50 per call
    'simple-lookup': 50     // $0.50 per call
  }
});

// 3. Create and apply the plugin
const plugin = createStripeMonetizationPlugin(config);
const proxiedServer = await wrapWithProxy(server, {
  plugins: [plugin]
});

// 4. Register your tools (they're now monetized automatically!)
proxiedServer.tool('ai-analysis', {
  text: z.string(),
  analysisType: z.enum(['sentiment', 'summary', 'keywords']).optional()
}, async (args) => {
  // Your AI analysis logic here
  return { content: [{ type: 'text', text: `Analysis result for: ${args.text}` }] };
});

// 5. Start the server
await proxiedServer.connect();
```

### Step 2: Setup Payment Processing (Web App)

Create API endpoints in your web application that integrate with Stripe's hosted UI:

**Option A: Express.js Integration**

```typescript
import express from 'express';
import { createStripeRoutes } from 'mcp-stripe-monetization';

const app = express();
app.use(express.json());

// Get Stripe endpoints from your plugin instance
const stripeEndpoints = plugin.getStripeEndpoints();

// Create pre-built routes for Stripe integration
const stripeRoutes = createStripeRoutes(stripeEndpoints);

// Mount the routes
app.post('/api/stripe/checkout', stripeRoutes.createCheckout);
app.post('/api/stripe/portal', stripeRoutes.createPortal);
app.post('/api/stripe/webhooks', stripeRoutes.handleWebhook);

app.listen(3000);
```

**Option B: Custom Implementation**

```typescript
// In your API routes
app.post('/api/buy-credits', async (req, res) => {
  const { customerId, toolName, quantity } = req.body;
  
  const { checkoutUrl } = await stripeEndpoints.createCheckoutSession({
    customerId,
    items: [{ toolName, quantity }],
    successUrl: `${req.headers.origin}/success`,
    cancelUrl: `${req.headers.origin}/pricing`
  });
  
  res.json({ checkoutUrl });
});

app.post('/api/manage-billing', async (req, res) => {
  const { customerId } = req.body;
  
  const { portalUrl } = await stripeEndpoints.createCustomerPortalSession({
    customerId,
    returnUrl: `${req.headers.origin}/dashboard`
  });
  
  res.json({ portalUrl });
});
```

### Step 3: Frontend Integration (Uses Stripe's Native UI)

**No custom frontend components needed!** Just call your API endpoints and redirect to Stripe:

```typescript
// When user clicks "Buy Credits"
async function buyCredits(toolName: string, quantity: number) {
  const response = await fetch('/api/buy-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: currentUser.id,
      toolName,
      quantity
    })
  });
  
  const { checkoutUrl } = await response.json();
  
  // Redirect to Stripe's hosted checkout page
  window.location.href = checkoutUrl;
}

// When user clicks "Manage Billing"
async function manageBilling() {
  const response = await fetch('/api/manage-billing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: currentUser.id })
  });
  
  const { portalUrl } = await response.json();
  
  // Redirect to Stripe's customer portal
  window.location.href = portalUrl;
}
```

### Step 4: Handle Success/Cancel Pages

Create simple pages to handle post-payment flows:

```html
<!-- /success page -->
<h1>Payment Successful! 🎉</h1>
<p>Your credits have been added to your account.</p>
<a href="/dashboard">Return to Dashboard</a>

<!-- /cancel page -->  
<h1>Payment Cancelled</h1>
<p>No charges were made to your account.</p>
<a href="/pricing">Back to Pricing</a>
```

## 🎯 That's It!

Your MCP tools are now monetized with:
- ✅ Automatic billing on every tool call
- ✅ Stripe's secure, hosted payment pages  
- ✅ Customer self-service portal
- ✅ Webhook handling for payment confirmations
- ✅ Usage tracking and analytics

## 🧪 Testing

### Get Free Stripe Test Keys

1. **Sign up at [stripe.com](https://stripe.com)** (completely free)
2. **Go to Developers → API keys** in the dashboard
3. **Copy your test keys** (they start with `pk_test_` and `sk_test_`)
4. **Set environment variables:**
   ```bash
   export STRIPE_SECRET_KEY=sk_test_your_key_here
   export STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

### Quick Test (No Setup Required)

Run our pre-built test server to see how it works:

```bash
# 1. Download and run the test script
curl -o quick-test.js https://raw.githubusercontent.com/your-repo/mcp-stripe-monetization/main/examples/quick-test.js
node quick-test.js

# 2. Open browser
open http://localhost:3000

# 3. Test the payment flow with these cards:
# Success: 4242424242424242
# Decline: 4000000000000002  
# 3D Secure: 4000000000003220
```

### What You'll See

1. **Tool calls blocked** until payment (expected behavior)
2. **Stripe checkout creation** (redirects to Stripe's hosted page) 
3. **Customer portal** for self-service billing
4. **Billing tracking** on every tool call
5. **Real payments** in your Stripe Dashboard

### Test Credit Cards

```bash
# Successful payments
4242424242424242   # Visa (most common)
5555555555554444   # Mastercard
4000056655665556   # Visa debit

# Failed payments  
4000000000000002   # Card declined
4000000000000069   # Expired card
4000000000000119   # Processing error

# Special scenarios
4000000000003220   # 3D Secure required
4000002500003155   # Insufficient funds
```

**For all test cards:** Use any future date (12/25), any CVC (123), any ZIP (12345)

## 🚀 Going Live

1. **Switch to Live Keys**: Replace test keys with live keys from Stripe
2. **Setup Webhooks**: Configure webhook endpoint in Stripe Dashboard
3. **Deploy**: Deploy your MCP server and web app to production
4. **Monitor**: Use Stripe Dashboard to monitor payments and customers

## 💡 Real-World Example

Here's what the complete developer experience looks like:

**Backend (your-mcp-server.ts)**
```typescript
import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';

const plugin = createStripeMonetizationPlugin(createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 100,
  toolPrices: { 'ai-analysis': 250 }
}));

const proxiedServer = await wrapWithProxy(server, { plugins: [plugin] });
```

**Web App (app.js)**
```typescript
// API route
app.post('/api/buy-credits', async (req, res) => {
  const { checkoutUrl } = await stripeEndpoints.createCheckoutSession({
    customerId: req.user.id,
    items: [{ toolName: 'ai-analysis', quantity: 10 }],
    successUrl: `${req.headers.origin}/success`,
    cancelUrl: `${req.headers.origin}/pricing`
  });
  res.json({ checkoutUrl });
});

// Frontend button
document.getElementById('buy-btn').onclick = async () => {
  const res = await fetch('/api/buy-credits', { method: 'POST' });
  const { checkoutUrl } = await res.json();
  window.location.href = checkoutUrl; // → User goes to Stripe checkout
};
```

**User Flow**
1. User clicks "Buy 10 AI Analysis Credits" 
2. Redirects to Stripe checkout page
3. User pays with credit card
4. Redirects back to your app
5. Credits are added to their account
6. Now they can call the `ai-analysis` tool 10 times

## 🎯 Billing Models

### 1. Per-Call Billing

Charge customers for each tool call with custom pricing per tool.

```typescript
const config = createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 50, // $0.50 default
  toolPrices: {
    'ai-analysis': 200,     // $2.00
    'data-processing': 100, // $1.00
    'simple-lookup': 25     // $0.25
  },
  volumeDiscounts: [
    { threshold: 1000, discountPercent: 10 }, // 10% off after 1000 calls
    { threshold: 5000, discountPercent: 20 }  // 20% off after 5000 calls
  ]
});
```

### 2. Subscription Plans

Offer monthly/yearly plans with included usage and overage billing.

```typescript
const config = createSubscriptionSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  plans: [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: 1999, // $19.99/month
      interval: 'month',
      includedCalls: 1000,
      overagePrice: 50, // $0.50 per additional call
      features: ['Standard AI tools', 'Email support']
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: 4999, // $49.99/month
      interval: 'month',
      includedCalls: 5000,
      overagePrice: 25, // $0.25 per additional call
      features: ['All AI tools', 'Priority support', 'Advanced analytics']
    }
  ],
  trialPeriodDays: 14
});
```

### 3. Credit System

Customers purchase credit packages and spend credits on tool usage.

```typescript
const config = createCreditSystemSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  creditPackages: [
    { credits: 100, price: 999, name: 'Starter Pack' },      // $9.99 for 100 credits
    { credits: 500, price: 3999, name: 'Power Pack' },       // $39.99 for 500 credits
    { credits: 1000, price: 6999, name: 'Enterprise Pack' }  // $69.99 for 1000 credits
  ],
  toolPrices: {
    'expensive-ai-tool': 5,  // 5 credits per call
    'basic-tool': 1,         // 1 credit per call
    'premium-analysis': 10   // 10 credits per call
  },
  autoRecharge: {
    threshold: 10,           // Auto-recharge when below 10 credits
    packageId: 'power-pack'  // Purchase Power Pack automatically
  }
});
```

### 4. Freemium Model

Free tier with limits and paid upgrade options.

```typescript
const config = createFreemiumSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  freeTier: {
    callsPerMonth: 100,
    tools: ['basic-search', 'simple-calculator'] // Only these tools are free
  },
  upgradeOptions: [
    // Subscription plans for upgrades
    {
      id: 'premium',
      name: 'Premium',
      price: 999, // $9.99/month
      interval: 'month',
      includedCalls: 1000,
      overagePrice: 10
    }
  ],
  limitExceededBehavior: 'block' // Block usage when limit exceeded
});
```

## 🔐 Authentication & Security

### JWT Authentication

```typescript
const config = createBasicSetup({
  // ... Stripe config
  authentication: {
    method: 'jwt',
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: '7d',
      issuer: 'your-app',
      audience: 'mcp-users'
    }
  }
});
```

### API Key Authentication

```typescript
const config = createBasicSetup({
  // ... Stripe config
  authentication: {
    method: 'api-key',
    apiKey: {
      headerName: 'X-API-Key',
      prefix: 'mcp_',
      hashAlgorithm: 'bcrypt'
    }
  }
});
```

### Rate Limiting & Security

```typescript
const config = createBasicSetup({
  // ... other config
  security: {
    rateLimiting: {
      enabled: true,
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100      // 100 requests per minute
    },
    requestValidation: {
      maxPayloadSize: 1024 * 1024, // 1MB
      validateHeaders: true,
      requireUserAgent: true
    },
    webhookSecurity: {
      verifySignatures: true,
      tolerance: 300 // 5 minutes
    }
  }
});
```

## 💾 Database Support

### SQLite (Default)

```typescript
const config = createBasicSetup({
  // ... other config
  database: {
    type: 'sqlite',
    connection: './monetization.db',
    runMigrations: true
  }
});
```

### PostgreSQL

```typescript
const config = createBasicSetup({
  // ... other config
  database: {
    type: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'mcp_monetization',
      username: 'user',
      password: 'password',
      ssl: true
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    },
    runMigrations: true
  }
});
```

## 📊 Analytics & Management

### Real-time Analytics

```typescript
const config = createBasicSetup({
  // ... other config
  analytics: {
    enabled: true,
    retentionDays: 90,
    realtimeDashboard: true,
    exportFormats: ['csv', 'json', 'xlsx'],
    customMetrics: ['tool_popularity', 'user_satisfaction']
  }
});
```

### Management API

The plugin automatically provides REST endpoints for managing your monetization:

- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/usage` - Usage statistics
- `GET /api/customers` - Customer management
- `POST /api/subscriptions` - Subscription management
- `GET /api/health` - Health check

## 🧪 Testing

### Local Development

For development and testing, use penny pricing:

```typescript
const config = createDevelopmentSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

// Automatically sets:
// - $0.01 pricing for all tools
// - SQLite database
// - Permissive rate limiting
// - Debug logging enabled
```

### Testing with npm link

```bash
# In mcp-stripe-monetization directory
npm link

# In your MCP server project
npm link mcp-stripe-monetization

# Test your integration
npm test
```

### Mock Stripe Testing

```typescript
// For testing without real Stripe calls
const config = createBasicSetup({
  stripeSecretKey: 'sk_test_mock',
  stripePublishableKey: 'pk_test_mock',
  webhookSecret: 'whsec_test_mock',
  // ... other config
});
```

## 🚢 Production Deployment

### Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Authentication
JWT_SECRET=your-jwt-secret

# Database (for PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Optional
MCP_MONETIZATION_DEBUG=false
MCP_MONETIZATION_ENV=production
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Health Monitoring

```typescript
// The plugin provides health check endpoints
const healthStatus = await fetch('/api/health');
const status = await healthStatus.json();

console.log(status);
// {
//   "status": "healthy",
//   "database": "connected",
//   "stripe": "connected",
//   "uptime": 3600,
//   "version": "1.0.0"
// }
```

## 📚 API Reference

### Plugin Configuration

See [`src/interfaces/config.ts`](src/interfaces/config.ts) for complete configuration options.

### Billing Events

The plugin emits events for billing operations:

```typescript
plugin.on('payment:success', (event) => {
  console.log(`Payment successful: ${event.amount} for ${event.toolName}`);
});

plugin.on('payment:failed', (event) => {
  console.log(`Payment failed: ${event.error}`);
});

plugin.on('subscription:created', (event) => {
  console.log(`New subscription: ${event.planId} for ${event.customerId}`);
});
```

### Error Handling

```typescript
import { PaymentError, RateLimitError, AuthenticationError } from 'mcp-stripe-monetization';

try {
  await toolCall();
} catch (error) {
  if (error instanceof PaymentError) {
    // Handle payment failure
  } else if (error instanceof RateLimitError) {
    // Handle rate limit exceeded
  } else if (error instanceof AuthenticationError) {
    // Handle authentication failure
  }
}
```

## 🤝 Integration Examples

### With Express.js

```typescript
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';

const app = express();
const server = new McpServer({ name: 'My AI Service', version: '1.0.0' });

// Configure monetization
const config = createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 100
});

const plugin = createStripeMonetizationPlugin(config);
const proxiedServer = await wrapWithProxy(server, { plugins: [plugin] });

// Register your AI tools
proxiedServer.tool('analyze', { text: z.string() }, async (args) => {
  // Your AI analysis logic
  return { content: [{ type: 'text', text: 'Analysis result...' }] };
});

app.listen(3000);
```

### With Next.js API Routes

```typescript
// pages/api/mcp/[...path].ts
import { createStripeMonetizationPlugin, createSubscriptionSetup } from 'mcp-stripe-monetization';

const config = createSubscriptionSetup({
  // ... configuration
});

const plugin = createStripeMonetizationPlugin(config);

export default async function handler(req, res) {
  // Handle MCP requests with monetization
  await plugin.handleRequest(req, res);
}
```

## 📖 Documentation

- [Configuration Guide](docs/configuration.md)
- [Billing Models](docs/billing-models.md)
- [Security Best Practices](docs/security.md)
- [API Reference](docs/api-reference.md)
- [Migration Guide](docs/migration.md)

## 🐛 Troubleshooting

### Common Issues

1. **Webhook verification failed**
   ```bash
   # Check your webhook secret
   echo $STRIPE_WEBHOOK_SECRET
   
   # Test webhook locally with Stripe CLI
   stripe listen --forward-to localhost:3000/webhooks/stripe
   ```

2. **Database connection issues**
   ```typescript
   // Enable debug logging
   const config = createBasicSetup({
     // ... config
     debug: true
   });
   ```

3. **Authentication failures**
   ```typescript
   // Verify JWT secret
   const config = createBasicSetup({
     // ... config
     authentication: {
       method: 'jwt',
       jwt: {
         secret: process.env.JWT_SECRET!, // Make sure this is set
         expiresIn: '7d'
       }
     }
   });
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- [GitHub Issues](https://github.com/modelcontextprotocol/mcp-stripe-monetization/issues)
- [Discord Community](https://discord.gg/mcp-community)
- [Documentation](https://mcp-stripe-monetization.readthedocs.io)

---

**Transform your MCP server into a profitable AI service today!** 🚀
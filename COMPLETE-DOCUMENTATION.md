# Complete MCP Stripe Monetization Documentation

## 🎯 Overview

The **MCP Stripe Monetization Plugin** is a backend-only solution that enables developers to monetize their Model Context Protocol (MCP) tools using Stripe's payment infrastructure. The plugin intercepts tool calls, handles billing logic, and integrates seamlessly with Stripe's hosted payment pages.

**Key Innovation: No Custom Frontend Required** - Uses Stripe's battle-tested checkout pages, customer portal, and payment forms.

---

## 🏗️ Architecture

### Core Components

```mermaid
graph TD
    A[User Calls MCP Tool] --> B[MCP Proxy Wrapper]
    B --> C[Stripe Monetization Plugin]
    C --> D{Has Credits?}
    D -->|No| E[Block Tool Call]
    D -->|Yes| F[Execute Tool]
    F --> G[Deduct Credits]
    E --> H[Return Payment Required Error]
    G --> I[Return Tool Result + Billing Info]
    
    J[User Buys Credits] --> K[Stripe Checkout Session]
    K --> L[Stripe Hosted Page]
    L --> M[Payment Success]
    M --> N[Webhook/Redirect]
    N --> O[Add Credits to Account]
```

### Data Flow

1. **Tool Call Interception**: Plugin hooks into MCP tool calls via proxy wrapper
2. **Credit Check**: Validates user has sufficient credits/subscription
3. **Payment Flow**: Redirects to Stripe for payment if needed
4. **Credit Management**: Tracks usage and balances in real-time
5. **Billing Integration**: Records transactions and generates analytics

---

## 🚀 Quick Start Guide

### Prerequisites

1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com) (free)
2. **Node.js**: Version 18+ 
3. **MCP Server**: Existing MCP server to monetize

### Installation

```bash
npm install mcp-stripe-monetization mcp-proxy-wrapper
```

### Basic Setup (5 Minutes)

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';

// 1. Create your MCP server
const server = new McpServer({
  name: 'Monetized AI Tools',
  version: '1.0.0'
});

// 2. Configure Stripe monetization
const config = createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 100, // $1.00 per call
  toolPrices: {
    'expensive-ai': 500,  // $5.00
    'standard-tool': 200, // $2.00
    'quick-lookup': 50    // $0.50
  }
});

// 3. Apply monetization
const plugin = createStripeMonetizationPlugin(config);
const proxiedServer = await wrapWithProxy(server, {
  plugins: [plugin]
});

// 4. Your tools are now monetized!
proxiedServer.tool('expensive-ai', schema, handler);
```

---

## 💳 Payment Integration

### Option 1: Stripe Checkout (Recommended)

**Backend API Endpoint:**
```typescript
import { createStripeRoutes } from 'mcp-stripe-monetization';

const stripeEndpoints = plugin.getStripeEndpoints();
const routes = createStripeRoutes(stripeEndpoints);

app.post('/api/stripe/checkout', routes.createCheckout);
```

**Frontend Integration:**
```typescript
// When user clicks "Buy Credits"
async function buyCredits() {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: currentUser.id,
      items: [{ toolName: 'expensive-ai', quantity: 10 }],
      successUrl: window.location.origin + '/success',
      cancelUrl: window.location.origin + '/pricing'
    })
  });
  
  const { checkoutUrl } = await response.json();
  
  // Redirect to Stripe's hosted checkout
  window.location.href = checkoutUrl;
}
```

### Option 2: Customer Portal (Self-Service)

```typescript
// Customer billing management
async function openBillingPortal() {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: currentUser.id })
  });
  
  const { portalUrl } = await response.json();
  window.open(portalUrl, '_blank');
}
```

### Option 3: Payment Links (Zero Code)

```typescript
// Create shareable payment links
const { url } = await stripeEndpoints.createPaymentLink({
  toolName: 'ai-analysis',
  priceId: 'price_1234567890', // Stripe price ID
  quantity: 1
});

// Share: https://buy.stripe.com/abc123
```

---

## 🎯 Billing Models

### 1. Per-Call Billing (Pay-as-you-go)

```typescript
const config = createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 100, // $1.00 default
  toolPrices: {
    'ai-analysis': 250,     // $2.50 per call
    'data-processing': 150, // $1.50 per call
    'simple-lookup': 50     // $0.50 per call
  },
  volumeDiscounts: [
    { threshold: 100, discountPercent: 10 }, // 10% off after 100 calls
    { threshold: 500, discountPercent: 20 }  // 20% off after 500 calls
  ]
});
```

### 2. Subscription Billing

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
      overagePrice: 50 // $0.50 per additional call
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: 4999, // $49.99/month
      interval: 'month',
      includedCalls: 5000,
      overagePrice: 25 // $0.25 per additional call
    }
  ]
});
```

### 3. Credit System

```typescript
const config = createCreditSystemSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  creditPackages: [
    { credits: 100, price: 999, name: 'Starter Pack' },    // $9.99
    { credits: 500, price: 3999, name: 'Power Pack' },     // $39.99
    { credits: 1000, price: 6999, name: 'Enterprise' }     // $69.99
  ],
  toolPrices: {
    'expensive-ai-tool': 10, // 10 credits per call
    'standard-tool': 5,      // 5 credits per call
    'basic-tool': 1          // 1 credit per call
  }
});
```

### 4. Freemium Model

```typescript
const config = createFreemiumSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  freeAllowance: {
    callsPerMonth: 100,        // 100 free calls per month
    resetDay: 1,               // Reset on 1st of each month
    freeTools: ['basic-search', 'simple-lookup']
  },
  premiumPlans: [
    {
      id: 'premium',
      price: 999, // $9.99/month
      unlimitedTools: true,
      additionalFeatures: ['priority-support', 'advanced-analytics']
    }
  ]
});
```

---

## 🧪 Testing & Development

### Get Stripe Test Keys

1. **Create Stripe Account**: [stripe.com](https://stripe.com) (free)
2. **Get Test Keys**: Dashboard → Developers → API keys
3. **Copy Keys**: 
   - Publishable: `pk_test_...`
   - Secret: `sk_test_...`

### Test Credit Cards

```bash
# Successful payments
4242424242424242   # Visa
5555555555554444   # Mastercard
4000056655665556   # Visa Debit

# Failed payments
4000000000000002   # Card declined
4000000000000069   # Expired card

# Special scenarios  
4000000000003220   # 3D Secure required
4000002500003155   # Insufficient funds
```

**For all cards**: Use any future date (12/25), any CVC (123), any ZIP (12345)

### Quick Test Script

```bash
# Download and run instant test
curl -o test.js https://raw.githubusercontent.com/your-repo/mcp-stripe-monetization/main/examples/simple-test.js

# Set your test keys
export STRIPE_SECRET_KEY=sk_test_your_key_here
export STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Run test server
node test.js

# Open browser
open http://localhost:8000
```

### Test Flow

1. **Try calling tool** → Blocked (no credits)
2. **Buy credits** → Redirected to Stripe checkout
3. **Use test card** → `4242424242424242`
4. **Return to app** → Credits added
5. **Call tool again** → Works, credits deducted
6. **Check Stripe Dashboard** → See test payments

---

## 🔧 Configuration Reference

### Basic Configuration

```typescript
interface StripeMonetizationConfig {
  // Core settings
  enabled: boolean;
  billingModel: 'per-call' | 'subscription' | 'credit-system' | 'freemium';
  environment: 'development' | 'staging' | 'production';
  
  // Stripe integration
  stripe: {
    secretKey: string;          // sk_test_... or sk_live_...
    publishableKey: string;     // pk_test_... or pk_live_...
    webhookSecret: string;      // whsec_...
    apiVersion: string;         // '2023-10-16'
  };
  
  // Billing configuration
  billing: {
    defaultPrice: number;       // Default price in cents
    currency: string;           // ISO currency code (usd, eur, etc.)
    toolPrices: Record<string, number>; // Tool-specific pricing
    volumeDiscounts?: Array<{
      threshold: number;        // Calls required for discount
      discountPercent: number;  // Discount percentage
    }>;
  };
  
  // Authentication
  authentication: {
    type: 'api-key' | 'jwt' | 'oauth';
    required: boolean;
    apiKeyHeader?: string;      // Default: 'x-api-key'
    jwtSecret?: string;
  };
  
  // Database (for customer/usage tracking)
  database: {
    type: 'sqlite' | 'postgresql' | 'mysql';
    path?: string;              // For SQLite
    connectionString?: string;  // For PostgreSQL/MySQL
    pool?: {
      min: number;
      max: number;
      idleTimeoutMillis: number;
    };
  };
  
  // Optional features
  analytics?: {
    enabled: boolean;
    retentionDays: number;
    exportFormat: 'json' | 'csv';
  };
  
  rateLimiting?: {
    enabled: boolean;
    windowMs: number;           // Time window in milliseconds
    maxCalls: number;           // Max calls per window
  };
  
  security?: {
    encryptData: boolean;
    auditLogs: boolean;
    ipWhitelist?: string[];
  };
}
```

### Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_test_or_live_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret_here

# Optional
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your_jwt_secret_here
API_KEY_HEADER=x-api-key
LOG_LEVEL=info
NODE_ENV=production
```

---

## 🎛️ API Reference

### Plugin Methods

```typescript
class StripeMonetizationPlugin {
  // Get Stripe endpoints for payment integration
  getStripeEndpoints(): StripeAPIEndpoints;
  
  // Plugin lifecycle
  async initialize(context: PluginContext): Promise<void>;
  async beforeToolCall(context: ToolCallContext): Promise<void | ToolCallResult>;
  async afterToolCall(context: ToolCallContext, result: ToolCallResult): Promise<ToolCallResult>;
  
  // Health and monitoring
  async healthCheck(): Promise<boolean>;
  async getStats(): Promise<PluginStats>;
}
```

### Stripe API Endpoints

```typescript
class StripeAPIEndpoints {
  // Checkout sessions
  async createCheckoutSession(params: {
    customerId: string;
    items: Array<{ toolName: string; quantity: number; priceId?: string }>;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ sessionId: string; checkoutUrl: string }>;
  
  // Customer portal
  async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ portalUrl: string }>;
  
  // Payment methods
  async setupPaymentMethod(params: {
    customerId: string;
    usage?: 'off_session' | 'on_session';
  }): Promise<{ clientSecret: string; setupIntentId: string }>;
  
  // Direct payments
  async processPayment(params: {
    customerId: string;
    amount: number;
    currency: string;
    toolName: string;
    paymentMethodId?: string;
    description?: string;
  }): Promise<PaymentResult>;
  
  // Customer management
  async ensureStripeCustomer(customerInfo: {
    id: string;
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<{ stripeCustomerId: string; isNew: boolean }>;
  
  // Webhooks
  async handleWebhook(payload: string, signature: string): Promise<{
    received: boolean;
    eventType?: string;
    processed?: boolean;
  }>;
}
```

### Express.js Routes

```typescript
import { createStripeRoutes } from 'mcp-stripe-monetization';

const routes = createStripeRoutes(stripeEndpoints);

// Mount routes
app.post('/api/stripe/checkout', routes.createCheckout);
app.post('/api/stripe/portal', routes.createPortal);
app.post('/api/stripe/setup-payment', routes.setupPaymentMethod);
app.post('/api/stripe/webhooks', routes.handleWebhook);
```

---

## 🚀 Production Deployment

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_your_live_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret

# Database
DATABASE_URL=postgresql://user:pass@prod-host:5432/prod_db

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
ENCRYPTION_KEY=your_32_byte_encryption_key_here

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_here
```

### Stripe Configuration

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live API Keys** from Developers → API keys
3. **Configure Webhooks**:
   - Endpoint: `https://yourdomain.com/api/stripe/webhooks`
   - Events: `payment_intent.succeeded`, `customer.subscription.created`, `invoice.payment_succeeded`
4. **Set up Products/Prices** in Stripe Dashboard for your tools

### Security Checklist

- ✅ Use HTTPS in production
- ✅ Validate webhook signatures
- ✅ Implement rate limiting
- ✅ Log all transactions
- ✅ Monitor for fraud
- ✅ Regular security updates
- ✅ Backup customer data
- ✅ PCI compliance (handled by Stripe)

### Monitoring & Analytics

```typescript
// Built-in analytics
const analytics = await plugin.getBillingAnalytics();
console.log({
  totalRevenue: analytics.totalRevenue,
  monthlyRevenue: analytics.monthlyRevenue,
  activeCustomers: analytics.activeCustomers,
  popularTools: analytics.popularTools,
  churnRate: analytics.churnRate
});

// Custom metrics
app.get('/admin/metrics', async (req, res) => {
  const stats = await plugin.getStats();
  const health = await plugin.healthCheck();
  
  res.json({
    status: health ? 'healthy' : 'unhealthy',
    stats,
    timestamp: new Date().toISOString()
  });
});
```

---

## 🔍 Troubleshooting

### Common Issues

**1. "Invalid API key"**
```bash
# Check your keys
echo $STRIPE_SECRET_KEY | cut -c1-20
# Should show: sk_test_ or sk_live_

# Verify in Stripe Dashboard
# Developers → API keys → Publishable/Secret key
```

**2. "Webhook signature verification failed"**
```typescript
// Ensure raw body is passed to webhook handler
app.use('/api/stripe/webhooks', express.raw({ type: 'application/json' }));
```

**3. "Customer not found"**
```typescript
// Auto-create customers
const { stripeCustomerId } = await stripeEndpoints.ensureStripeCustomer({
  id: userId,
  email: user.email,
  name: user.name
});
```

**4. "Tool call blocked unexpectedly"**
```typescript
// Check credit balance
const customer = await getCustomerInfo(userId);
console.log('Credits:', customer.creditBalance);

// Check tool pricing
const price = config.billing.toolPrices[toolName] || config.billing.defaultPrice;
console.log('Required:', price);
```

### Debug Mode

```typescript
const config = createBasicSetup({
  // ... other config
  debug: true,
  logLevel: 'debug'
});

// Enable detailed logging
const plugin = createStripeMonetizationPlugin(config);
```

### Health Checks

```bash
# Check plugin health
curl http://localhost:3000/api/health

# Check Stripe connectivity
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  https://api.stripe.com/v1/customers

# Check database
curl http://localhost:3000/api/db/health
```

---

## 📚 Examples & Use Cases

### 1. AI Writing Assistant

```typescript
// Per-word pricing model
const config = createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 1, // $0.01 per word
  toolPrices: {
    'generate-article': 500,    // $5.00 per article
    'grammar-check': 100,       // $1.00 per check
    'translate-text': 200,      // $2.00 per translation
    'summarize-content': 150    // $1.50 per summary
  }
});

proxiedServer.tool('generate-article', {
  topic: z.string(),
  length: z.number(),
  style: z.enum(['formal', 'casual', 'technical'])
}, async (args) => {
  // Your AI article generation logic
  const article = await generateArticle(args.topic, args.length, args.style);
  return { content: [{ type: 'text', text: article }] };
});
```

### 2. Data Analysis Platform

```typescript
// Credit-based system for data processing
const config = createCreditSystemSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  creditPackages: [
    { credits: 1000, price: 999, name: 'Analyst Pack' },      // $9.99
    { credits: 5000, price: 3999, name: 'Professional' },     // $39.99
    { credits: 20000, price: 12999, name: 'Enterprise' }      // $129.99
  ],
  toolPrices: {
    'process-csv': 10,          // 10 credits per 1000 rows
    'generate-charts': 25,      // 25 credits per chart
    'ml-prediction': 50,        // 50 credits per prediction
    'export-report': 15         // 15 credits per report
  }
});
```

### 3. API Gateway Monetization

```typescript
// Subscription model for API access
const config = createSubscriptionSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  plans: [
    {
      id: 'developer',
      name: 'Developer Plan',
      price: 2999, // $29.99/month
      interval: 'month',
      includedCalls: 10000,
      rateLimits: { requestsPerMinute: 100 }
    },
    {
      id: 'business',
      name: 'Business Plan', 
      price: 9999, // $99.99/month
      interval: 'month',
      includedCalls: 100000,
      rateLimits: { requestsPerMinute: 1000 }
    }
  ]
});
```

### 4. Freemium SaaS Tool

```typescript
// Free tier with paid upgrades
const config = createFreemiumSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  freeAllowance: {
    callsPerMonth: 50,
    resetDay: 1,
    freeTools: ['basic-search', 'simple-analysis']
  },
  premiumPlans: [
    {
      id: 'pro',
      price: 1999, // $19.99/month
      unlimitedTools: true,
      additionalFeatures: ['advanced-analytics', 'api-access', 'priority-support']
    }
  ]
});
```

---

## 🤝 Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/mcp-stripe-monetization
cd mcp-stripe-monetization

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your Stripe test keys

# Run tests
npm test

# Start development server
npm run dev
```

### Testing Guidelines

```bash
# Run all tests
npm test

# Run integration tests with real Stripe
npm run test:integration

# Run performance tests
npm run test:performance

# Check code coverage
npm run test:coverage
```

### Code Style

```bash
# Lint code
npm run lint

# Format code  
npm run format

# Type check
npm run type-check
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Documentation
- 📖 **Full Docs**: [docs.mcp-stripe.com](https://docs.mcp-stripe.com)
- 🎥 **Video Tutorials**: [youtube.com/mcp-stripe](https://youtube.com/mcp-stripe)
- 💬 **Discord Community**: [discord.gg/mcp-stripe](https://discord.gg/mcp-stripe)

### Help & Issues
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-org/mcp-stripe-monetization/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-org/mcp-stripe-monetization/discussions)
- 📧 **Email Support**: support@mcp-stripe.com

### Enterprise Support
- 🏢 **Enterprise Plans**: Custom pricing and dedicated support
- 🔧 **Professional Services**: Implementation assistance and custom integrations  
- 📞 **Phone Support**: Priority phone support for enterprise customers

---

**🚀 Ready to monetize your MCP tools? Get started in 5 minutes!**

```bash
npm install mcp-stripe-monetization
# Add your Stripe keys and start earning! 💰
```
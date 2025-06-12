# MCP Stripe Monetization Architecture

## Overview

The MCP Stripe Monetization plugin follows a **backend-first architecture** where the plugin provides API endpoints and webhook handlers, while frontend UI components are delivered separately as optional packages or examples.

## Architecture Decision: Separate UI Delivery

### Problem
The initial implementation included frontend UI components directly in the plugin package, which creates several issues:
- Mixes backend logic with frontend presentation
- Forces specific UI technology choices on consumers
- Complicates deployment and testing
- Violates separation of concerns

### Solution: Multi-Package Architecture

```
mcp-stripe-monetization/              # Core backend plugin
├── src/core/                        # Plugin logic & API endpoints
├── src/interfaces/                  # TypeScript interfaces
├── src/utils/                      # Utilities & helpers
└── api/                           # REST API endpoints for payments

mcp-stripe-ui/                      # Optional UI package (separate repo)
├── react/                         # React components
├── vanilla/                       # Vanilla JS widgets
├── vue/                          # Vue.js components
└── examples/                     # Integration examples

mcp-stripe-quickstart/             # Starter templates (separate repo)
├── express-react/                 # Express + React example
├── nextjs/                       # Next.js example
└── standalone/                   # Standalone payment pages
```

## Payment Flow Architecture

### Backend (This Package)
The plugin provides secure backend functionality:

1. **Authentication & Authorization**
   - API key validation
   - JWT token verification
   - User session management

2. **Billing Engine**
   - Tool call metering
   - Price calculation
   - Usage tracking
   - Volume discounts

3. **Stripe Integration**
   - Payment processing
   - Subscription management
   - Webhook handling
   - Customer management

4. **API Endpoints**
   - `/api/customers/*` - Customer management
   - `/api/payments/*` - Payment processing
   - `/api/subscriptions/*` - Subscription handling
   - `/api/usage/*` - Usage analytics
   - `/api/billing/*` - Billing operations

### Stripe Native Solutions (Recommended)

Stripe provides several built-in UI solutions that eliminate the need for custom frontend code:

#### 1. Stripe Checkout (Easiest)
Pre-built, hosted payment pages:

```typescript
// Backend: Create checkout session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'AI Tool Credits' },
      unit_amount: 2000, // $20.00
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: 'https://your-app.com/success',
  cancel_url: 'https://your-app.com/cancel',
});

// Frontend: Redirect to Stripe
window.location.href = session.url;
```

#### 2. Stripe Customer Portal
Hosted customer management interface:

```typescript
// Backend: Create portal session
const portalSession = await stripe.billingPortal.sessions.create({
  customer: 'cust_123',
  return_url: 'https://your-app.com/dashboard',
});

// Frontend: Redirect to manage billing
window.location.href = portalSession.url;
```

#### 3. Stripe Elements (Custom UI)
Embeddable payment forms:

```html
<div id="payment-element"></div>
<script src="https://js.stripe.com/v3/"></script>
<script>
  const stripe = Stripe('pk_test_...');
  const elements = stripe.elements();
  const paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');
</script>
```

#### 4. Stripe Payment Links
Simple, shareable payment links:

```typescript
// Create payment link (one-time setup)
const paymentLink = await stripe.paymentLinks.create({
  line_items: [{ price: 'price_1234', quantity: 1 }],
});

// Share link: https://buy.stripe.com/abc123
```

## Payment Flow Implementation

### 1. Use Stripe Checkout (Recommended)
The plugin provides backend endpoints that create Stripe Checkout sessions:

```typescript
import { StripeAPIEndpoints } from 'mcp-stripe-monetization';

const endpoints = new StripeAPIEndpoints(config);

// Create checkout session
const { checkoutUrl } = await endpoints.createCheckoutSession({
  customerId: 'user_123',
  items: [{ toolName: 'ai-analysis', quantity: 1 }],
  successUrl: 'https://your-app.com/success',
  cancelUrl: 'https://your-app.com/cancel'
});

// Redirect user to Stripe's hosted checkout
window.location.href = checkoutUrl;
```

### 2. Use Stripe Customer Portal
For customer self-service (manage billing, change plans, etc.):

```typescript
// Create portal session
const { portalUrl } = await endpoints.createCustomerPortalSession({
  customerId: 'user_123',
  returnUrl: 'https://your-app.com/dashboard'
});

// Redirect to Stripe's hosted portal
window.location.href = portalUrl;
```

### 3. Use Stripe Elements (Advanced)
For custom embedded payment forms:

```typescript
// Backend: Setup payment method
const { clientSecret } = await endpoints.setupPaymentMethod({
  customerId: 'user_123'
});

// Frontend: Use Stripe.js
const stripe = Stripe('pk_test_...');
const elements = stripe.elements();
const paymentElement = elements.create('payment', { clientSecret });
paymentElement.mount('#payment-element');
```

## Integration Patterns

### Pattern 1: MCP Tool Provider
For developers building MCP servers who want to monetize their tools:

```typescript
import { createStripeMonetizationPlugin } from 'mcp-stripe-monetization';
import { wrapWithProxy } from 'mcp-proxy-wrapper';

const plugin = createStripeMonetizationPlugin(config);
const proxiedServer = await wrapWithProxy(server, { plugins: [plugin] });

// Payment UI handled separately by client applications
```

### Pattern 2: Application Developer
For applications consuming monetized MCP tools:

```typescript
// Backend: Use MCP client to call monetized tools
const mcpClient = new McpClient(transport);
const result = await mcpClient.callTool('ai-analysis', { text: 'analyze this' });

// Frontend: Handle payment UI for end users
import { PaymentWidget } from '@mcp-stripe/widgets';
const widget = new PaymentWidget({ apiBase: 'https://api.example.com' });
```

### Pattern 3: End-to-End Solution
For quick deployment with minimal setup:

```bash
# Deploy backend
npm install mcp-stripe-monetization
# Configure and start server

# Deploy frontend
npm install -g @mcp-stripe/quickstart
mcp-stripe init --template=react
# Customize and deploy
```

## Benefits of This Architecture

1. **Separation of Concerns**: Backend focuses on billing, frontend focuses on UX
2. **Technology Flexibility**: Support multiple frontend frameworks
3. **Deployment Independence**: Frontend and backend can be deployed separately
4. **Customization**: Easy to customize UI without touching backend logic
5. **Reusability**: Backend can serve multiple frontend applications
6. **Testing**: Easier to test backend logic and frontend interactions separately

## Migration from Current Implementation

The current frontend components in `src/frontend/` will be:

1. **Moved** to a separate `@mcp-stripe/ui-components` package
2. **Converted** to embeddable widgets and React components
3. **Enhanced** with better customization options
4. **Documented** with integration examples

The core plugin will expose only the necessary API endpoints for frontend integration.
#!/usr/bin/env node

/**
 * @file Example: Using MCP Stripe Plugin with Stripe's Native UI
 * 
 * This example shows how to integrate the MCP Stripe monetization plugin
 * with Stripe's hosted payment solutions (Checkout, Customer Portal).
 * 
 * No custom frontend needed - uses Stripe's battle-tested UI components.
 */

import { createStripeMonetizationPlugin, createBasicSetup, StripeAPIEndpoints } from '../src/index.js';

async function demonstrateStripeNativeUI() {
  console.log('🎨 MCP Stripe Plugin with Native Stripe UI\n');

  // 1. Setup the plugin with backend-only configuration
  console.log('⚙️  Setting up backend plugin...');
  const config = createBasicSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_key',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock_secret',
    defaultPrice: 100, // $1.00 per call
    toolPrices: {
      'ai-analysis': 250,      // $2.50
      'data-processing': 150,  // $1.50
      'simple-lookup': 50      // $0.50
    }
  });

  const plugin = createStripeMonetizationPlugin(config);
  await plugin.initialize({
    logger: {
      info: (msg: string) => console.log(`ℹ️  ${msg}`),
      error: (msg: string) => console.error(`❌ ${msg}`),
      debug: (msg: string) => console.log(`🐛 ${msg}`)
    }
  });

  // 2. Get Stripe endpoints for payment processing
  console.log('🔗 Getting Stripe API endpoints...');
  const stripeEndpoints = plugin.getStripeEndpoints();

  // 3. Simulate different payment flows

  console.log('\n💳 Payment Flow 1: Stripe Checkout (One-time payment)');
  console.log('=====================================');
  
  const checkoutSession = await stripeEndpoints.createCheckoutSession({
    customerId: 'user_123',
    items: [
      { toolName: 'ai-analysis', quantity: 5 },
      { toolName: 'data-processing', quantity: 3 }
    ],
    successUrl: 'https://your-app.com/success',
    cancelUrl: 'https://your-app.com/cancel',
    metadata: {
      purchaseType: 'tool-credits',
      source: 'web-app'
    }
  });

  console.log('✅ Checkout session created!');
  console.log('   Session ID:', checkoutSession.sessionId);
  console.log('   Checkout URL:', checkoutSession.checkoutUrl);
  console.log('   👆 User would be redirected to this Stripe-hosted page');

  console.log('\n🏛️  Payment Flow 2: Customer Portal (Self-service)');
  console.log('=============================================');
  
  const portalSession = await stripeEndpoints.createCustomerPortalSession({
    customerId: 'user_123',
    returnUrl: 'https://your-app.com/dashboard'
  });

  console.log('✅ Portal session created!');
  console.log('   Portal URL:', portalSession.portalUrl);
  console.log('   👆 Customer can manage billing, download invoices, update payment methods');

  console.log('\n📋 Payment Flow 3: Subscription Checkout');
  console.log('=====================================');
  
  const subscriptionCheckout = await stripeEndpoints.createSubscriptionCheckout({
    customerId: 'user_123',
    priceId: 'price_pro_monthly',
    trialDays: 14,
    successUrl: 'https://your-app.com/welcome',
    cancelUrl: 'https://your-app.com/pricing',
    metadata: {
      plan: 'pro',
      source: 'upgrade-flow'
    }
  });

  console.log('✅ Subscription checkout created!');
  console.log('   Session ID:', subscriptionCheckout.sessionId);
  console.log('   Checkout URL:', subscriptionCheckout.checkoutUrl);
  console.log('   👆 User gets 14-day trial, then $49/month');

  console.log('\n🔗 Payment Flow 4: Payment Links (Shareable)');
  console.log('=========================================');
  
  const paymentLink = await stripeEndpoints.createPaymentLink({
    toolName: 'ai-analysis',
    priceId: 'price_ai_analysis_credit_pack',
    quantity: 10,
    metadata: {
      package: 'ai-analysis-10-pack'
    }
  });

  console.log('✅ Payment link created!');
  console.log('   Link ID:', paymentLink.paymentLinkId);
  console.log('   URL:', paymentLink.url);
  console.log('   👆 Can be shared via email, social media, QR codes, etc.');

  console.log('\n💡 Integration Examples');
  console.log('===================');

  console.log('\n📱 In your web app:');
  console.log(`
  // When user clicks "Buy Credits"
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: currentUser.id,
      items: [{ toolName: 'ai-analysis', quantity: 10 }],
      successUrl: window.location.origin + '/success',
      cancelUrl: window.location.origin + '/pricing'
    })
  });
  
  const { checkoutUrl } = await response.json();
  window.location.href = checkoutUrl; // Redirect to Stripe
  `);

  console.log('\n🎛️  In your Express.js server:');
  console.log(`
  import { createStripeRoutes } from 'mcp-stripe-monetization';
  
  const stripeRoutes = createStripeRoutes(stripeEndpoints);
  
  app.post('/api/stripe/checkout', stripeRoutes.createCheckout);
  app.post('/api/stripe/portal', stripeRoutes.createPortal);
  app.post('/api/stripe/webhooks', stripeRoutes.handleWebhook);
  `);

  console.log('\n🎉 Benefits of Stripe Native UI:');
  console.log('===============================');
  console.log('✅ PCI compliance handled by Stripe');
  console.log('✅ Mobile-optimized, accessible forms');
  console.log('✅ Supports 135+ currencies and payment methods');
  console.log('✅ Built-in fraud protection');
  console.log('✅ Automatic tax calculation');
  console.log('✅ Real-time payment status updates');
  console.log('✅ No frontend development needed');
  console.log('✅ Customizable branding and styling');

  console.log('\n📋 Next Steps:');
  console.log('=============');
  console.log('1. Set up real Stripe account and API keys');
  console.log('2. Configure webhook endpoint for payment confirmations');
  console.log('3. Create Stripe products and prices in your dashboard');
  console.log('4. Implement the backend routes in your Express/Next.js app');
  console.log('5. Test with Stripe test cards: 4242424242424242');
  console.log('6. Deploy and start accepting payments! 💰');
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateStripeNativeUI().catch(console.error);
}
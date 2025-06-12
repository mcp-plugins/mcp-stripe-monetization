/**
 * @file Subscription Billing Example
 * @version 1.0.0
 * @description Example of setting up subscription-based billing with multiple plans
 */

import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createStripeMonetizationPlugin,
  createSubscriptionSetup,
} from '../index.js';

/**
 * Example 1: Basic subscription setup with multiple plans
 */
async function basicSubscriptionExample() {
  const server = new McpServer({
    name: 'subscription-ai-server',
    version: '1.0.0',
  });

  // Add tools that will be included in subscription plans
  server.tool('text-analysis', 'Analyze text content', {
    type: 'object',
    properties: {
      text: { type: 'string' },
      analysisType: { type: 'string', enum: ['sentiment', 'keywords', 'summary'] },
    },
    required: ['text', 'analysisType'],
  }, async (request) => {
    const { text, analysisType } = request.params;
    // Simulate text analysis
    return {
      content: [
        {
          type: 'text',
          text: `${analysisType} analysis of "${text.substring(0, 50)}...": Positive sentiment detected.`,
        },
      ],
    };
  });

  server.tool('language-translation', 'Translate text between languages', {
    type: 'object',
    properties: {
      text: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
    },
    required: ['text', 'from', 'to'],
  }, async (request) => {
    const { text, from, to } = request.params;
    // Simulate translation
    return {
      content: [
        {
          type: 'text',
          text: `Translated from ${from} to ${to}: [Translated text would appear here]`,
        },
      ],
    };
  });

  // Configure subscription plans
  const config = createSubscriptionSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    plans: [
      {
        id: 'starter',
        name: 'Starter Plan',
        priceId: 'price_starter_monthly', // Your Stripe Price ID
        amount: 2900, // $29.00/month
        callsIncluded: 1000,
        interval: 'month',
      },
      {
        id: 'professional',
        name: 'Professional Plan',
        priceId: 'price_pro_monthly',
        amount: 9900, // $99.00/month
        callsIncluded: 5000,
        interval: 'month',
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        priceId: 'price_enterprise_monthly',
        amount: 29900, // $299.00/month
        callsIncluded: 20000,
        interval: 'month',
      },
    ],
    currency: 'usd',
  });

  // Add trial period and overage settings
  config.pricing.subscription!.trialPeriod = {
    enabled: true,
    days: 14,
    callsIncluded: 100, // 100 free calls during trial
  };

  // Configure overage pricing for when users exceed plan limits
  config.pricing.subscription!.plans.forEach(plan => {
    plan.overageRate = 5; // $0.05 per call over limit
  });

  const plugin = createStripeMonetizationPlugin(config);
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [plugin],
    debug: true,
  });

  console.log('📋 Subscription billing setup complete!');
  console.log('🎯 Plans available:');
  console.log('  • Starter: $29/month (1,000 calls)');
  console.log('  • Professional: $99/month (5,000 calls)');
  console.log('  • Enterprise: $299/month (20,000 calls)');
  console.log('🎁 14-day free trial with 100 calls');
  console.log('💡 Overage: $0.05 per additional call');

  return wrappedServer;
}

/**
 * Example 2: Annual plans with discounts
 */
async function annualSubscriptionExample() {
  const server = new McpServer({
    name: 'annual-billing-server',
    version: '1.0.0',
  });

  // Add a premium AI tool
  server.tool('advanced-ai-analysis', 'Advanced AI-powered analysis', {
    type: 'object',
    properties: {
      data: { type: 'string' },
      model: { type: 'string', enum: ['standard', 'premium', 'enterprise'] },
    },
    required: ['data'],
  }, async (request) => {
    return {
      content: [
        {
          type: 'text',
          text: 'Advanced AI analysis completed with insights and recommendations.',
        },
      ],
    };
  });

  const config = createSubscriptionSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    plans: [
      // Monthly plans
      {
        id: 'pro_monthly',
        name: 'Professional Monthly',
        priceId: 'price_pro_monthly',
        amount: 9900, // $99/month
        callsIncluded: 5000,
        interval: 'month',
      },
      // Annual plans with 20% discount
      {
        id: 'pro_annual',
        name: 'Professional Annual',
        priceId: 'price_pro_annual',
        amount: 95040, // $950.40/year (20% discount)
        callsIncluded: 5000,
        interval: 'year',
      },
      {
        id: 'enterprise_monthly',
        name: 'Enterprise Monthly',
        priceId: 'price_enterprise_monthly',
        amount: 29900, // $299/month
        callsIncluded: 25000,
        interval: 'month',
      },
      {
        id: 'enterprise_annual',
        name: 'Enterprise Annual',
        priceId: 'price_enterprise_annual',
        amount: 287040, // $2,870.40/year (20% discount)
        callsIncluded: 25000,
        interval: 'year',
      },
    ],
  });

  // Add additional features for annual plans
  config.pricing.subscription!.plans.forEach(plan => {
    if (plan.interval === 'year') {
      plan.features = [
        '20% discount vs monthly',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
      ];
    } else {
      plan.features = [
        'Standard support',
        'Basic analytics',
      ];
    }
  });

  const plugin = createStripeMonetizationPlugin(config);
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [plugin],
  });

  console.log('📅 Annual subscription setup complete!');
  console.log('💰 Save 20% with annual billing');
  console.log('🎯 Professional: $99/month or $950/year');
  console.log('🚀 Enterprise: $299/month or $2,870/year');

  return wrappedServer;
}

/**
 * Example 3: Usage-based subscriptions with metered billing
 */
async function meteredSubscriptionExample() {
  const server = new McpServer({
    name: 'metered-billing-server',
    version: '1.0.0',
  });

  server.tool('api-processing', 'Process API requests', {
    type: 'object',
    properties: {
      requests: { type: 'array' },
      complexity: { type: 'string', enum: ['simple', 'complex'] },
    },
    required: ['requests'],
  }, async (request) => {
    return {
      content: [
        {
          type: 'text',
          text: `Processed ${request.params.requests.length} API requests`,
        },
      ],
    };
  });

  const config = createSubscriptionSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    plans: [
      {
        id: 'base_plus_usage',
        name: 'Base + Usage Plan',
        priceId: 'price_base_subscription',
        amount: 1900, // $19 base fee
        callsIncluded: 500, // 500 included calls
        interval: 'month',
      },
    ],
  });

  // Configure usage-based billing for additional calls
  config.pricing.usageBased = {
    pricePerUnit: 2, // $0.02 per additional call
    meterId: 'meter_api_calls', // Your Stripe Meter ID
    aggregation: 'sum',
    tiers: [
      { upTo: 1000, unitAmount: 2 },     // $0.02 for calls 501-1500
      { upTo: 5000, unitAmount: 1.5 },   // $0.015 for calls 1501-6000  
      { upTo: 'inf', unitAmount: 1 },    // $0.01 for calls 6000+
    ],
    minimumCharge: 1900, // Minimum $19/month
  };

  const plugin = createStripeMonetizationPlugin(config);
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [plugin],
  });

  console.log('📊 Metered subscription setup complete!');
  console.log('💰 Base: $19/month (500 calls included)');
  console.log('📈 Additional usage:');
  console.log('  • Calls 501-1,500: $0.02 each');
  console.log('  • Calls 1,501-6,000: $0.015 each');
  console.log('  • Calls 6,000+: $0.01 each');

  return wrappedServer;
}

/**
 * Example 4: Team/Multi-seat subscriptions
 */
async function teamSubscriptionExample() {
  const server = new McpServer({
    name: 'team-collaboration-server',
    version: '1.0.0',
  });

  server.tool('team-analysis', 'Collaborative team analysis tool', {
    type: 'object',
    properties: {
      teamId: { type: 'string' },
      analysis: { type: 'string' },
    },
    required: ['teamId', 'analysis'],
  }, async (request) => {
    return {
      content: [
        {
          type: 'text',
          text: `Team analysis completed for team ${request.params.teamId}`,
        },
      ],
    };
  });

  const config = createSubscriptionSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    plans: [
      {
        id: 'team_5',
        name: 'Team Plan (5 seats)',
        priceId: 'price_team_5_seats',
        amount: 14900, // $149/month
        callsIncluded: 10000,
        interval: 'month',
      },
      {
        id: 'team_10',
        name: 'Team Plan (10 seats)',
        priceId: 'price_team_10_seats',
        amount: 24900, // $249/month
        callsIncluded: 20000,
        interval: 'month',
      },
      {
        id: 'team_unlimited',
        name: 'Enterprise (Unlimited seats)',
        priceId: 'price_enterprise_unlimited',
        amount: 49900, // $499/month
        callsIncluded: 100000,
        interval: 'month',
      },
    ],
  });

  // Add team-specific features
  config.pricing.subscription!.plans.forEach(plan => {
    if (plan.id.includes('team_5')) {
      plan.features = ['5 team members', 'Shared workspace', 'Basic analytics'];
    } else if (plan.id.includes('team_10')) {
      plan.features = ['10 team members', 'Advanced collaboration', 'Priority support'];
    } else if (plan.id.includes('unlimited')) {
      plan.features = ['Unlimited team members', 'Custom integrations', 'Dedicated support'];
    }
  });

  const plugin = createStripeMonetizationPlugin(config);
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [plugin],
  });

  console.log('👥 Team subscription setup complete!');
  console.log('🎯 Plans available:');
  console.log('  • Team 5: $149/month (5 seats, 10K calls)');
  console.log('  • Team 10: $249/month (10 seats, 20K calls)');
  console.log('  • Enterprise: $499/month (unlimited seats, 100K calls)');

  return wrappedServer;
}

// Export examples
export {
  basicSubscriptionExample,
  annualSubscriptionExample,
  meteredSubscriptionExample,
  teamSubscriptionExample,
};

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  basicSubscriptionExample()
    .then(() => console.log('Subscription example completed!'))
    .catch((error) => console.error('Example failed:', error));
}
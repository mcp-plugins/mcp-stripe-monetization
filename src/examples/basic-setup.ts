/**
 * @file Basic Setup Example
 * @version 1.0.0
 * @description Example of setting up the Stripe monetization plugin with basic per-call billing
 */

// Import the MCP proxy wrapper and Stripe monetization plugin
import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createStripeMonetizationPlugin,
  createBasicSetup,
  createDevelopmentSetup,
} from '../index.js';

/**
 * Example 1: Basic per-call billing setup
 */
async function basicPerCallExample() {
  // Create your MCP server (this is your existing server)
  const server = new McpServer({
    name: 'my-awesome-ai-server',
    version: '1.0.0',
  });

  // Add your tools to the server
  server.tool('calculate', 'Perform basic calculations', {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  }, async (request) => {
    const { operation, a, b } = request.params;
    
    let result: number;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': 
        if (b === 0) throw new Error('Division by zero');
        result = a / b; 
        break;
      default: throw new Error('Invalid operation');
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `${a} ${operation} ${b} = ${result}`,
        },
      ],
    };
  });

  // Configure Stripe monetization
  const monetizationConfig = createBasicSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    defaultPrice: 50, // $0.50 per call
    currency: 'usd',
    databasePath: './monetization.db',
  });

  // Create the monetization plugin
  const monetizationPlugin = createStripeMonetizationPlugin(monetizationConfig);

  // Wrap your server with the proxy and monetization
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [monetizationPlugin],
    debug: true,
  });

  console.log('✅ Basic per-call billing setup complete!');
  console.log('📄 Customers will be charged $0.50 for each tool call');
  console.log('💾 Usage data stored in ./monetization.db');
  
  return wrappedServer;
}

/**
 * Example 2: Development setup with lower prices
 */
async function developmentExample() {
  const server = new McpServer({
    name: 'development-server',
    version: '1.0.0',
  });

  // Add a simple echo tool for testing
  server.tool('echo', 'Echo back the input message', {
    type: 'object',
    properties: {
      message: { type: 'string' },
    },
    required: ['message'],
  }, async (request) => {
    return {
      content: [
        {
          type: 'text',
          text: `Echo: ${request.params.message}`,
        },
      ],
    };
  });

  // Use development setup with penny pricing
  const config = createDevelopmentSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  });

  const plugin = createStripeMonetizationPlugin(config);
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [plugin],
    debug: true,
  });

  console.log('🚧 Development setup complete!');
  console.log('💰 Only $0.01 per call for testing');
  console.log('🔧 Management API available at http://localhost:3001');
  
  return wrappedServer;
}

/**
 * Example 3: Custom pricing per tool
 */
async function customPricingExample() {
  const server = new McpServer({
    name: 'ai-services-server',
    version: '1.0.0',
  });

  // Add multiple tools with different complexity/costs
  server.tool('simple-calculation', 'Basic math operations', {
    type: 'object',
    properties: {
      operation: { type: 'string' },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  }, async (request) => {
    // Simple calculation logic
    return { content: [{ type: 'text', text: 'Result: 42' }] };
  });

  server.tool('ai-image-generation', 'Generate AI images', {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      style: { type: 'string' },
    },
    required: ['prompt'],
  }, async (request) => {
    // Complex AI image generation logic
    return { content: [{ type: 'text', text: 'Generated image URL: https://...' }] };
  });

  server.tool('data-analysis', 'Analyze datasets', {
    type: 'object',
    properties: {
      data: { type: 'array' },
      analysisType: { type: 'string' },
    },
    required: ['data', 'analysisType'],
  }, async (request) => {
    // Data analysis logic
    return { content: [{ type: 'text', text: 'Analysis complete' }] };
  });

  // Create configuration with custom pricing
  const config = createBasicSetup({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    defaultPrice: 25, // $0.25 default
  });

  // Customize pricing for specific tools
  config.pricing.perCall = {
    defaultPrice: 25, // $0.25 for simple operations
    toolPricing: {
      'simple-calculation': 10,     // $0.10 for simple math
      'ai-image-generation': 500,   // $5.00 for AI image generation
      'data-analysis': 200,         // $2.00 for data analysis
    },
    bulkTiers: [
      { minCalls: 100, pricePerCall: 20 },  // 20% discount for 100+ calls
      { minCalls: 1000, pricePerCall: 15 }, // 40% discount for 1000+ calls
    ],
  };

  const plugin = createStripeMonetizationPlugin(config);
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [plugin],
  });

  console.log('🎯 Custom pricing setup complete!');
  console.log('💡 Simple calculations: $0.10');
  console.log('🎨 AI image generation: $5.00');
  console.log('📊 Data analysis: $2.00');
  console.log('🎁 Volume discounts available!');
  
  return wrappedServer;
}

/**
 * Example 4: Environment-based configuration
 */
async function environmentConfigExample() {
  const server = new McpServer({
    name: 'production-server',
    version: '1.0.0',
  });

  // Load configuration from environment variables
  const config = {
    enabled: true,
    priority: 100,
    billingModel: 'per_call' as const,
    
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY!,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      mode: process.env.STRIPE_MODE as 'test' | 'live' || 'test',
    },
    
    database: {
      type: (process.env.DATABASE_TYPE as 'sqlite' | 'postgresql' | 'mysql') || 'sqlite',
      connectionString: process.env.DATABASE_URL || './production.db',
      autoMigrate: true,
    },
    
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'your-super-secure-secret',
      tokenExpiration: '24h',
      enableApiKeys: true,
    },
    
    pricing: {
      currency: process.env.CURRENCY || 'usd',
      perCall: {
        defaultPrice: parseInt(process.env.DEFAULT_PRICE || '100'),
      },
    },
    
    rateLimiting: {
      enabled: true,
      windowMs: 60 * 1000, // 1 minute
      maxRequests: parseInt(process.env.RATE_LIMIT || '100'),
    },
    
    managementApi: {
      enabled: process.env.ENABLE_MANAGEMENT_API === 'true',
      port: parseInt(process.env.MANAGEMENT_API_PORT || '3001'),
      host: process.env.MANAGEMENT_API_HOST || '127.0.0.1',
      enableCors: true,
      adminAuth: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'secure-password',
      },
    },
  };

  const plugin = createStripeMonetizationPlugin(config);
  const wrappedServer = await wrapWithProxy(server, {
    plugins: [plugin],
  });

  console.log('🌍 Environment-based configuration loaded!');
  console.log(`💰 Default price: $${config.pricing.perCall!.defaultPrice / 100}`);
  console.log(`🏦 Database: ${config.database.type}`);
  console.log(`🔒 Rate limit: ${config.rateLimiting!.maxRequests} requests/minute`);
  
  return wrappedServer;
}

// Export examples for use
export {
  basicPerCallExample,
  developmentExample,
  customPricingExample,
  environmentConfigExample,
};

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  // Run the basic example if this file is executed directly
  basicPerCallExample()
    .then(() => console.log('Example completed successfully!'))
    .catch((error) => console.error('Example failed:', error));
}
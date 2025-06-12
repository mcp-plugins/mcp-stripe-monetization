#!/usr/bin/env node

/**
 * @file Example usage of MCP Stripe Monetization Plugin
 * 
 * This example shows how to integrate the Stripe monetization plugin
 * with an MCP server using the proxy wrapper system.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { wrapWithProxy } from 'mcp-proxy-wrapper';
import { createStripeMonetizationPlugin, createBasicSetup } from './src/index.js';
import { z } from 'zod';

// Mock the proxy wrapper for this example
const mockWrapWithProxy = async (server: any, options: any) => {
  console.log('🔧 [MOCK] Wrapping server with proxy and plugins');
  console.log('📦 [MOCK] Plugins:', options.plugins?.map((p: any) => p.name));
  
  // Simulate plugin initialization
  for (const plugin of options.plugins || []) {
    await plugin.initialize({
      logger: {
        info: (msg: string) => console.log(`ℹ️  [PLUGIN] ${msg}`),
        error: (msg: string) => console.error(`❌ [PLUGIN] ${msg}`),
        debug: (msg: string) => console.log(`🐛 [PLUGIN] ${msg}`)
      }
    });
  }
  
  return server;
};

async function main() {
  console.log('🚀 Starting MCP Stripe Monetization Example\n');

  try {
    // 1. Create MCP Server
    console.log('📡 Creating MCP Server...');
    const server = new McpServer({
      name: 'Monetized AI Tools Server',
      version: '1.0.0'
    });

    // 2. Configure Stripe Monetization Plugin
    console.log('💳 Configuring Stripe monetization...');
    const config = createBasicSetup({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_key',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock_secret',
      defaultPrice: 100, // $1.00 per call
      toolPrices: {
        'ai-analysis': 250,      // $2.50
        'data-processing': 150,  // $1.50
        'simple-lookup': 50      // $0.50
      },
      volumeDiscounts: [
        { threshold: 100, discountPercent: 10 }, // 10% off after 100 calls
        { threshold: 500, discountPercent: 20 }  // 20% off after 500 calls
      ]
    });

    console.log('🔌 Creating plugin instance...');
    const plugin = createStripeMonetizationPlugin(config);

    // 3. Wrap server with proxy and plugin
    console.log('🔄 Wrapping server with monetization...');
    const proxiedServer = await mockWrapWithProxy(server, {
      plugins: [plugin]
    });

    // 4. Register monetized tools
    console.log('🛠️  Registering monetized tools...');

    // AI Analysis Tool - $2.50 per call
    proxiedServer.tool('ai-analysis', {
      text: z.string(),
      analysisType: z.enum(['sentiment', 'summary', 'keywords']).optional()
    }, async (args: any) => {
      console.log(`🤖 Processing AI analysis: ${args.analysisType || 'default'}`);
      
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        content: [{
          type: 'text' as const,
          text: `AI Analysis Result for "${args.text.substring(0, 50)}..."\n\nType: ${args.analysisType || 'general'}\nProcessed at: ${new Date().toISOString()}`
        }]
      };
    });

    // Data Processing Tool - $1.50 per call
    proxiedServer.tool('data-processing', {
      data: z.array(z.any()),
      operation: z.enum(['sort', 'filter', 'transform', 'aggregate'])
    }, async (args: any) => {
      console.log(`📊 Processing data: ${args.operation} on ${args.data.length} items`);
      
      return {
        content: [{
          type: 'text' as const,
          text: `Data processing complete.\nOperation: ${args.operation}\nItems processed: ${args.data.length}\nResult: [processed data]`
        }]
      };
    });

    // Simple Lookup Tool - $0.50 per call
    proxiedServer.tool('simple-lookup', {
      query: z.string(),
      source: z.string().optional()
    }, async (args: any) => {
      console.log(`🔍 Looking up: ${args.query}`);
      
      return {
        content: [{
          type: 'text' as const,
          text: `Lookup result for "${args.query}"\nSource: ${args.source || 'default'}\nFound: Sample result data`
        }]
      };
    });

    // 5. Simulate tool calls with billing
    console.log('\n💰 Simulating monetized tool calls...\n');

    await simulateToolCall(plugin, 'ai-analysis', {
      text: 'This is a sample text for AI analysis',
      analysisType: 'sentiment'
    });

    await simulateToolCall(plugin, 'data-processing', {
      data: [1, 2, 3, 4, 5],
      operation: 'sort'
    });

    await simulateToolCall(plugin, 'simple-lookup', {
      query: 'test query',
      source: 'example'
    });

    // 6. Show plugin statistics
    console.log('\n📈 Plugin Statistics:');
    const stats = await plugin.getStats();
    console.log('  Calls processed:', stats.callsProcessed);
    console.log('  Errors encountered:', stats.errorsEncountered);
    console.log('  Average processing time:', stats.averageProcessingTime + 'ms');

    // 7. Health check
    console.log('\n🏥 Plugin Health Check:');
    const isHealthy = await plugin.healthCheck();
    console.log('  Status:', isHealthy ? '✅ Healthy' : '❌ Unhealthy');

    console.log('\n✅ Example completed successfully!');
    console.log('\n📖 Next steps:');
    console.log('  1. Set up real Stripe account and keys');
    console.log('  2. Configure database (PostgreSQL/MySQL for production)');
    console.log('  3. Set up authentication (JWT/API keys)');
    console.log('  4. Implement real MCP client integration');
    console.log('  5. Deploy to production with monitoring');

  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

async function simulateToolCall(plugin: any, toolName: string, args: any) {
  console.log(`🔄 Calling tool: ${toolName}`);
  
  // Create mock context
  const context = {
    toolName,
    args,
    metadata: {
      requestId: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      // Simulate authentication
      authorization: 'Bearer mock_token_123'
    }
  };

  try {
    // Simulate beforeToolCall hook
    const beforeResult = await plugin.beforeToolCall(context);
    
    if (beforeResult) {
      // Plugin short-circuited (e.g., auth failure)
      console.log('  ⚠️  Tool call blocked:', beforeResult.result.content[0].text);
      return;
    }

    // Simulate tool execution
    const toolResult = {
      result: {
        content: [{
          type: 'text',
          text: `Mock result for ${toolName}`
        }],
        _meta: {}
      }
    };

    // Simulate afterToolCall hook
    const finalResult = await plugin.afterToolCall(context, toolResult);
    
    console.log('  ✅ Tool call successful');
    if (finalResult.result._meta?.billing) {
      const billing = finalResult.result._meta.billing;
      console.log(`  💰 Charged: $${(billing.amount / 100).toFixed(2)} ${billing.currency?.toUpperCase()}`);
    }
    
  } catch (error) {
    console.log('  ❌ Tool call failed:', error instanceof Error ? error.message : error);
  }
  
  console.log(''); // Empty line for readability
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
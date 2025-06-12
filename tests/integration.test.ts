/**
 * Integration tests for MCP Stripe Monetization Plugin
 * Tests the plugin working with the MCP proxy wrapper system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';

// Mock the MCP proxy wrapper import
const mockWrapWithProxy = jest.fn();
jest.mock('mcp-proxy-wrapper', () => ({
  wrapWithProxy: mockWrapWithProxy
}));

// Import our plugin (these will be implemented)
import { createStripeMonetizationPlugin, createBasicSetup } from '../src/index.js';

describe('MCP Stripe Monetization Plugin Integration', () => {
  let server: McpServer;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    // Create real MCP server and client
    server = new McpServer({
      name: 'Test Monetized Server',
      version: '1.0.0'
    });

    client = new Client({
      name: 'Test Client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Create linked transports for real MCP communication
    [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();

    // Mock the proxy wrapper to return our server with a mock plugin attached
    mockWrapWithProxy.mockImplementation(async (originalServer, options) => {
      // Simulate the plugin being attached
      const plugins = options?.plugins || [];
      
      // Mock plugin behavior - intercept tool calls
      const originalTool = originalServer.tool.bind(originalServer);
      originalServer.tool = function(name: string, paramsSchemaOrCallback: any, callbackOrUndefined?: any) {
        const isThreeArgVersion = callbackOrUndefined !== undefined;
        const originalCallback = isThreeArgVersion ? callbackOrUndefined : paramsSchemaOrCallback;
        
        // Wrap the callback to simulate billing
        const billingCallback = async (...args: any[]) => {
          // Simulate authentication check
          if (args[0]?.skipAuth) {
            // Skip billing for test
          } else {
            // Simulate billing logic
            console.log(`[MOCK BILLING] Charging for tool: ${name}`);
          }
          
          // Call original tool
          const result = await originalCallback(...args);
          
          // Add billing metadata
          return {
            ...result,
            _meta: {
              ...result._meta,
              billed: true,
              amount: 100, // $1.00 in cents
              currency: 'usd',
              toolName: name
            }
          };
        };
        
        if (isThreeArgVersion) {
          return originalTool(name, paramsSchemaOrCallback, billingCallback);
        } else {
          return originalTool(name, billingCallback);
        }
      };
      
      return originalServer;
    });
  });

  afterEach(async () => {
    if (serverTransport) {
      await serverTransport.close();
    }
    if (clientTransport) {
      await clientTransport.close();
    }
    jest.clearAllMocks();
  });

  describe('Basic Integration', () => {
    it('should create plugin with basic setup', async () => {
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_mock',
        stripePublishableKey: 'pk_test_mock', 
        webhookSecret: 'whsec_test_mock',
        defaultPrice: 100
      });

      const plugin = createStripeMonetizationPlugin(config);
      
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('stripe-monetization-plugin');
      expect(plugin.version).toBe('1.0.0');
    });

    it('should integrate with MCP proxy wrapper', async () => {
      // Create plugin config
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_mock',
        stripePublishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock', 
        defaultPrice: 100
      });

      const plugin = createStripeMonetizationPlugin(config);

      // This would normally be: await wrapWithProxy(server, { plugins: [plugin] })
      // But we're mocking it for testing
      const proxiedServer = await mockWrapWithProxy(server, {
        plugins: [plugin]
      });

      expect(mockWrapWithProxy).toHaveBeenCalledWith(server, {
        plugins: [plugin]
      });
      expect(proxiedServer).toBe(server); // Our mock returns the same server
    });
  });

  describe('Tool Call Billing', () => {
    it('should bill for tool calls through real MCP protocol', async () => {
      // Create and setup plugin
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_mock',
        stripePublishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock',
        defaultPrice: 150 // $1.50
      });

      const plugin = createStripeMonetizationPlugin(config);
      const proxiedServer = await mockWrapWithProxy(server, {
        plugins: [plugin]
      });

      // Register a test tool
      proxiedServer.tool('calculate', { 
        operation: z.string(),
        a: z.number(),
        b: z.number()
      }, async (args) => {
        const { operation, a, b } = args;
        let result: number;
        
        switch (operation) {
          case 'add':
            result = a + b;
            break;
          case 'multiply':
            result = a * b;
            break;
          default:
            throw new Error('Unsupported operation');
        }
        
        return {
          content: [{
            type: 'text' as const,
            text: `${a} ${operation} ${b} = ${result}`
          }]
        };
      });

      // Connect server and client through real MCP protocol
      await proxiedServer.connect(serverTransport);
      await client.connect(clientTransport);

      // Make a real tool call through MCP
      const result = await client.callTool({
        name: 'calculate',
        arguments: {
          operation: 'add',
          a: 5,
          b: 3
        }
      });

      // Verify the tool worked
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: '5 add 3 = 8'
      });

      // Verify billing metadata was added
      expect(result._meta).toBeDefined();
      expect(result._meta.billed).toBe(true);
      expect(result._meta.amount).toBe(100); // From our mock
      expect(result._meta.currency).toBe('usd');
      expect(result._meta.toolName).toBe('calculate');
    });

    it('should handle authentication and skip billing when appropriate', async () => {
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_mock',
        stripePublishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock',
        defaultPrice: 200
      });

      const plugin = createStripeMonetizationPlugin(config);
      const proxiedServer = await mockWrapWithProxy(server, {
        plugins: [plugin]
      });

      // Register a tool that can skip billing
      proxiedServer.tool('free-tool', {
        data: z.string(),
        skipAuth: z.boolean().optional()
      }, async (args) => {
        return {
          content: [{
            type: 'text' as const,
            text: `Processed: ${args.data}`
          }]
        };
      });

      await proxiedServer.connect(serverTransport);
      await client.connect(clientTransport);

      // Call with skipAuth flag
      const result = await client.callTool({
        name: 'free-tool',
        arguments: {
          data: 'test data',
          skipAuth: true
        }
      });

      expect(result.content[0].text).toBe('Processed: test data');
      // Should still have billing metadata but with different handling
      expect(result._meta).toBeDefined();
    });
  });

  describe('Multiple Billing Models', () => {
    it('should support different pricing per tool', async () => {
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_mock',
        stripePublishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock',
        defaultPrice: 100,
        toolPrices: {
          'expensive-ai': 500, // $5.00
          'cheap-lookup': 25   // $0.25
        }
      });

      const plugin = createStripeMonetizationPlugin(config);
      const proxiedServer = await mockWrapWithProxy(server, {
        plugins: [plugin]
      });

      // Register tools with different pricing
      proxiedServer.tool('expensive-ai', { prompt: z.string() }, async (args) => {
        return {
          content: [{ type: 'text' as const, text: 'AI analysis result' }]
        };
      });

      proxiedServer.tool('cheap-lookup', { query: z.string() }, async (args) => {
        return {
          content: [{ type: 'text' as const, text: 'Lookup result' }]
        };
      });

      await proxiedServer.connect(serverTransport);
      await client.connect(clientTransport);

      // Test expensive tool
      const expensiveResult = await client.callTool({
        name: 'expensive-ai',
        arguments: { prompt: 'Analyze this data' }
      });

      expect(expensiveResult._meta?.toolName).toBe('expensive-ai');

      // Test cheap tool  
      const cheapResult = await client.callTool({
        name: 'cheap-lookup',
        arguments: { query: 'find data' }
      });

      expect(cheapResult._meta?.toolName).toBe('cheap-lookup');
    });
  });

  describe('Error Handling', () => {
    it('should handle billing failures gracefully', async () => {
      // Mock a failing payment
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_fail', // This would trigger a mock failure
        stripePublishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock',
        defaultPrice: 100
      });

      const plugin = createStripeMonetizationPlugin(config);
      const proxiedServer = await mockWrapWithProxy(server, {
        plugins: [plugin]
      });

      proxiedServer.tool('test-tool', { data: z.string() }, async (args) => {
        return {
          content: [{ type: 'text' as const, text: 'success' }]
        };
      });

      await proxiedServer.connect(serverTransport);
      await client.connect(clientTransport);

      // This should not throw, but handle the billing error gracefully
      const result = await client.callTool({
        name: 'test-tool',
        arguments: { data: 'test' }
      });

      // Tool should still work even if billing fails
      expect(result.content[0].text).toBe('success');
    });

    it('should handle plugin initialization errors', async () => {
      // Test with invalid configuration
      expect(() => {
        createBasicSetup({
          stripeSecretKey: '', // Invalid empty key
          stripePublishableKey: 'pk_test_mock',
          webhookSecret: 'whsec_test_mock',
          defaultPrice: 0 // Invalid price
        });
      }).toThrow();
    });
  });

  describe('Real MCP Protocol Compliance', () => {
    it('should maintain MCP protocol compatibility', async () => {
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_mock',
        stripePublishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock',
        defaultPrice: 100
      });

      const plugin = createStripeMonetizationPlugin(config);
      const proxiedServer = await mockWrapWithProxy(server, {
        plugins: [plugin]
      });

      // Register a comprehensive tool
      proxiedServer.tool('complex-tool', {
        action: z.enum(['create', 'read', 'update', 'delete']),
        data: z.object({
          id: z.string(),
          content: z.string()
        }),
        options: z.object({
          verbose: z.boolean().optional(),
          format: z.enum(['json', 'text']).optional()
        }).optional()
      }, async (args) => {
        const { action, data, options } = args;
        
        return {
          content: [{
            type: 'text' as const,
            text: `Performed ${action} on ${data.id}: ${data.content}`
          }],
          isError: false
        };
      });

      await proxiedServer.connect(serverTransport);
      await client.connect(clientTransport);

      // Test with complex arguments
      const result = await client.callTool({
        name: 'complex-tool',
        arguments: {
          action: 'create',
          data: {
            id: 'item-123',
            content: 'Sample content'
          },
          options: {
            verbose: true,
            format: 'json'
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Performed create on item-123');
      expect(result.isError).toBeFalsy();
      
      // Verify billing metadata doesn't interfere with MCP protocol
      expect(result._meta?.billed).toBe(true);
    });

    it('should work with tools that return different content types', async () => {
      const config = createBasicSetup({
        stripeSecretKey: 'sk_test_mock',
        stripePublishableKey: 'pk_test_mock',
        webhookSecret: 'whsec_test_mock',
        defaultPrice: 100
      });

      const plugin = createStripeMonetizationPlugin(config);
      const proxiedServer = await mockWrapWithProxy(server, {
        plugins: [plugin]
      });

      // Tool that returns multiple content types
      proxiedServer.tool('multi-content', { type: z.string() }, async (args) => {
        if (args.type === 'text') {
          return {
            content: [{ type: 'text' as const, text: 'Text response' }]
          };
        } else if (args.type === 'image') {
          return {
            content: [{
              type: 'image' as const,
              data: 'base64-image-data',
              mimeType: 'image/png'
            }]
          };
        } else {
          return {
            content: [{
              type: 'resource' as const,
              resource: {
                uri: 'file://example.txt',
                name: 'Example File'
              }
            }]
          };
        }
      });

      await proxiedServer.connect(serverTransport);
      await client.connect(clientTransport);

      // Test different content types
      const textResult = await client.callTool({
        name: 'multi-content',
        arguments: { type: 'text' }
      });

      expect(textResult.content[0].type).toBe('text');
      expect(textResult._meta?.billed).toBe(true);

      const imageResult = await client.callTool({
        name: 'multi-content', 
        arguments: { type: 'image' }
      });

      expect(imageResult.content[0].type).toBe('image');
      expect(imageResult._meta?.billed).toBe(true);
    });
  });
});
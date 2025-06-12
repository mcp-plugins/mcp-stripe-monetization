/**
 * @file MCP Stripe Monetization Plugin Core Implementation
 * @version 1.0.0
 */

import { BasePlugin } from 'mcp-proxy-wrapper';
import type { ToolCallContext, ToolCallResult } from 'mcp-proxy-wrapper';
import type { StripeMonetizationConfig } from '../interfaces/config.js';
import { StripeAPIEndpoints } from '../api/stripe-endpoints.js';

/**
 * Main Stripe Monetization Plugin
 */
export class StripeMonetizationPlugin extends BasePlugin {
  name = 'stripe-monetization-plugin';
  version = '1.0.0';
  
  private config: StripeMonetizationConfig;
  private initialized = false;
  private stripeEndpoints: StripeAPIEndpoints;

  constructor(config: StripeMonetizationConfig) {
    super();
    this.config = config;
    this.stripeEndpoints = new StripeAPIEndpoints(config);
    
    // Set plugin configuration
    this.config = {
      enabled: true,
      priority: 150, // Higher than default to run billing checks first
      debug: config.debug || false
    };
  }

  /**
   * Initialize the plugin
   */
  async initialize(context: any): Promise<void> {
    await super.initialize(context);
    
    context.logger.info(`Initializing Stripe Monetization Plugin v${this.version}`);
    context.logger.info(`Billing model: ${this.config.billingModel}`);
    context.logger.info(`Environment: ${this.config.environment}`);
    
    try {
      // Validate configuration
      this.validateConfig();
      
      // Initialize database (mock implementation for now)
      await this.initializeDatabase();
      
      // Initialize Stripe (mock implementation for now)
      await this.initializeStripe();
      
      // Initialize authentication (mock implementation for now)
      await this.initializeAuth();
      
      this.initialized = true;
      context.logger.info('Stripe Monetization Plugin initialized successfully');
      
    } catch (error) {
      context.logger.error('Failed to initialize Stripe Monetization Plugin:', error);
      throw error;
    }
  }

  /**
   * Before tool call hook - handle authentication and billing
   */
  async beforeToolCall(context: ToolCallContext): Promise<void | ToolCallResult> {
    if (!this.initialized) {
      throw new Error('Stripe Monetization Plugin not initialized');
    }

    try {
      // 1. Authentication check (mock implementation)
      const authResult = await this.authenticateUser(context);
      if (!authResult.authenticated) {
        return {
          result: {
            isError: true,
            content: [{
              type: 'text',
              text: 'Authentication required. Please provide valid credentials.'
            }]
          }
        };
      }

      // 2. Rate limiting check (mock implementation)
      const rateLimitResult = await this.checkRateLimit(context, authResult.userId);
      if (rateLimitResult.exceeded) {
        return {
          result: {
            isError: true,
            content: [{
              type: 'text',
              text: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`
            }]
          }
        };
      }

      // 3. Billing check (mock implementation)
      const billingResult = await this.checkBilling(context, authResult.userId);
      if (!billingResult.canProceed) {
        return {
          result: {
            isError: true,
            content: [{
              type: 'text',
              text: billingResult.message || 'Payment required to use this tool.'
            }]
          }
        };
      }

      // 4. Add billing metadata to context
      context.metadata = {
        ...context.metadata,
        billing: {
          userId: authResult.userId,
          amount: billingResult.amount,
          currency: 'usd',
          billingModel: this.config.billingModel
        }
      };

      // Continue to tool execution
      return undefined;

    } catch (error) {
      console.error('Error in Stripe monetization beforeToolCall:', error);
      
      // Return error but allow tool to proceed in development
      if (this.config.environment === 'development') {
        console.warn('Development mode: allowing tool call despite billing error');
        return undefined;
      }
      
      return {
        result: {
          isError: true,
          content: [{
            type: 'text',
            text: 'Billing system temporarily unavailable. Please try again later.'
          }]
        }
      };
    }
  }

  /**
   * After tool call hook - record usage and process payment
   */
  async afterToolCall(context: ToolCallContext, result: ToolCallResult): Promise<ToolCallResult> {
    if (!this.initialized) {
      return result;
    }

    try {
      const billingData = context.metadata?.billing;
      
      if (billingData) {
        // Record usage (mock implementation)
        await this.recordUsage({
          userId: billingData.userId,
          toolName: context.toolName,
          amount: billingData.amount,
          timestamp: new Date(),
          success: !result.result.isError
        });

        // Process payment (mock implementation)
        if (!result.result.isError) {
          await this.processPayment({
            userId: billingData.userId,
            amount: billingData.amount,
            toolName: context.toolName,
            billingModel: billingData.billingModel
          });
        }

        // Add billing metadata to result
        result.result._meta = {
          ...result.result._meta,
          billing: {
            charged: !result.result.isError,
            amount: billingData.amount,
            currency: 'usd',
            toolName: context.toolName,
            timestamp: new Date().toISOString()
          }
        };
      }

      return result;

    } catch (error) {
      console.error('Error in Stripe monetization afterToolCall:', error);
      
      // Don't fail the tool call due to billing errors
      // Just add error metadata
      result.result._meta = {
        ...result.result._meta,
        billing: {
          error: 'Billing processing failed',
          charged: false
        }
      };
      
      return result;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if plugin is initialized
      if (!this.initialized) {
        return false;
      }

      // Mock health checks
      const checks = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkStripeHealth(),
        this.checkAuthHealth()
      ]);

      return checks.every(check => check.status === 'fulfilled' && check.value);
    } catch {
      return false;
    }
  }

  /**
   * Get plugin statistics
   */
  async getStats() {
    return {
      callsProcessed: 0, // Mock data
      errorsEncountered: 0,
      averageProcessingTime: 100,
      lastActivity: Date.now()
    };
  }

  /**
   * Get Stripe API endpoints for integration with web applications
   * This allows external apps to handle payments using Stripe's native UI
   */
  getStripeEndpoints(): StripeAPIEndpoints {
    return this.stripeEndpoints;
  }

  // Private helper methods (mock implementations)

  private validateConfig(): void {
    if (!this.config.stripe?.secretKey) {
      throw new Error('Stripe secret key is required');
    }
    if (!this.config.stripe?.publishableKey) {
      throw new Error('Stripe publishable key is required');
    }
    if (!this.config.stripe?.webhookSecret) {
      throw new Error('Stripe webhook secret is required');
    }
  }

  private async initializeDatabase(): Promise<void> {
    // Mock database initialization
    console.log('[MOCK] Database initialized');
  }

  private async initializeStripe(): Promise<void> {
    // Mock Stripe initialization
    console.log('[MOCK] Stripe initialized');
  }

  private async initializeAuth(): Promise<void> {
    // Mock auth initialization
    console.log('[MOCK] Authentication initialized');
  }

  private async authenticateUser(context: ToolCallContext): Promise<{ authenticated: boolean; userId?: string }> {
    // Mock authentication - check for auth header or token
    const authHeader = context.metadata?.authorization || context.args?.auth;
    
    if (!authHeader) {
      return { authenticated: false };
    }

    // Mock user ID extraction
    return { 
      authenticated: true, 
      userId: 'user_' + Math.random().toString(36).substr(2, 9) 
    };
  }

  private async checkRateLimit(context: ToolCallContext, userId: string): Promise<{ exceeded: boolean; retryAfter?: number }> {
    // Mock rate limiting
    return { exceeded: false };
  }

  private async checkBilling(context: ToolCallContext, userId: string): Promise<{ canProceed: boolean; amount?: number; message?: string }> {
    // Mock billing check based on billing model
    switch (this.config.billingModel) {
      case 'per-call':
        return {
          canProceed: true,
          amount: 100 // $1.00 in cents
        };
      
      case 'subscription':
        return {
          canProceed: true,
          amount: 0 // Subscription covers the cost
        };
      
      case 'freemium':
        return {
          canProceed: true,
          amount: 0 // Free tier
        };
      
      default:
        return {
          canProceed: true,
          amount: 100
        };
    }
  }

  private async recordUsage(usage: any): Promise<void> {
    // Mock usage recording
    console.log('[MOCK] Usage recorded:', usage);
  }

  private async processPayment(payment: any): Promise<void> {
    // Mock payment processing
    console.log('[MOCK] Payment processed:', payment);
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    // Mock database health check
    return true;
  }

  private async checkStripeHealth(): Promise<boolean> {
    // Mock Stripe health check
    return true;
  }

  private async checkAuthHealth(): Promise<boolean> {
    // Mock auth health check
    return true;
  }
}
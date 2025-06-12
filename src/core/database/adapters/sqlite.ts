/**
 * @file SQLite Database Adapter
 * @version 1.0.0
 * @description SQLite implementation of the database adapter interface
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseConfig } from '../../../interfaces/config.js';
import {
  CustomerInfo,
  UsageRecord,
  PaymentIntentInfo,
  SubscriptionInfo,
  CreditTransaction,
  AnalyticsData,
  WebhookEvent,
  BillingSummary,
  StripeMonetizationStats,
} from '../../../interfaces/billing.js';
import { DatabaseError } from '../../../interfaces/errors.js';
import { DatabaseAdapter } from '../manager.js';

/**
 * SQLite database adapter implementation
 */
export class SqliteAdapter implements DatabaseAdapter {
  private db!: sqlite3.Database;
  private config: DatabaseConfig;
  private initialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize the SQLite database connection
   */
  async initialize(): Promise<void> {
    try {
      this.db = new sqlite3.Database(this.config.connectionString);
      
      // Promisify database methods for easier async/await usage
      this.db.run = promisify(this.db.run.bind(this.db));
      this.db.get = promisify(this.db.get.bind(this.db));
      this.db.all = promisify(this.db.all.bind(this.db));

      // Configure SQLite settings
      await this.db.run('PRAGMA foreign_keys = ON');
      await this.db.run('PRAGMA journal_mode = WAL');
      await this.db.run('PRAGMA synchronous = NORMAL');

      this.initialized = true;
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize SQLite database: ${error instanceof Error ? error.message : String(error)}`,
        'initialize',
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db && this.initialized) {
      const closeAsync = promisify(this.db.close.bind(this.db));
      await closeAsync();
      this.initialized = false;
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.db) {
      return false;
    }

    try {
      await this.db.get('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Run database migrations
   */
  async migrate(): Promise<void> {
    if (!this.initialized) {
      throw new DatabaseError('Database not initialized', 'migrate');
    }

    try {
      // Create customers table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS ${this.getTableName('customers')} (
          customer_id TEXT PRIMARY KEY,
          stripe_customer_id TEXT UNIQUE,
          email TEXT NOT NULL UNIQUE,
          name TEXT,
          metadata TEXT,
          subscription_status TEXT,
          plan_id TEXT,
          credits INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          usage_total_calls INTEGER DEFAULT 0,
          usage_current_period_calls INTEGER DEFAULT 0,
          usage_last_call_at DATETIME,
          usage_total_spent INTEGER DEFAULT 0,
          payment_method_type TEXT,
          payment_method_last4 TEXT,
          payment_method_brand TEXT,
          payment_method_expiry_month INTEGER,
          payment_method_expiry_year INTEGER,
          status TEXT NOT NULL DEFAULT 'active'
        )
      `);

      // Create usage records table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS ${this.getTableName('usage_records')} (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          args TEXT,
          cost INTEGER NOT NULL,
          credits INTEGER,
          timestamp DATETIME NOT NULL,
          processing_time INTEGER,
          success BOOLEAN NOT NULL,
          error TEXT,
          metadata TEXT,
          billing_period TEXT,
          subscription_id TEXT,
          payment_intent_id TEXT,
          FOREIGN KEY (customer_id) REFERENCES ${this.getTableName('customers')} (customer_id)
        )
      `);

      // Create payment intents table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS ${this.getTableName('payment_intents')} (
          payment_intent_id TEXT PRIMARY KEY,
          amount INTEGER NOT NULL,
          currency TEXT NOT NULL,
          status TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          confirmed_at DATETIME,
          metadata TEXT,
          FOREIGN KEY (customer_id) REFERENCES ${this.getTableName('customers')} (customer_id)
        )
      `);

      // Create subscriptions table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS ${this.getTableName('subscriptions')} (
          id TEXT PRIMARY KEY,
          stripe_subscription_id TEXT UNIQUE NOT NULL,
          customer_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          status TEXT NOT NULL,
          current_period_start DATETIME NOT NULL,
          current_period_end DATETIME NOT NULL,
          trial_end DATETIME,
          canceled_at DATETIME,
          cancel_at_period_end BOOLEAN DEFAULT FALSE,
          current_period_usage INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT,
          FOREIGN KEY (customer_id) REFERENCES ${this.getTableName('customers')} (customer_id)
        )
      `);

      // Create credit transactions table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS ${this.getTableName('credit_transactions')} (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          type TEXT NOT NULL,
          amount INTEGER NOT NULL,
          balance_after INTEGER NOT NULL,
          description TEXT NOT NULL,
          reference TEXT,
          timestamp DATETIME NOT NULL,
          expires_at DATETIME,
          metadata TEXT,
          FOREIGN KEY (customer_id) REFERENCES ${this.getTableName('customers')} (customer_id)
        )
      `);

      // Create webhook events table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS ${this.getTableName('webhook_events')} (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          data TEXT NOT NULL,
          customer_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed_at DATETIME,
          error TEXT,
          retry_count INTEGER DEFAULT 0,
          next_retry_at DATETIME,
          FOREIGN KEY (customer_id) REFERENCES ${this.getTableName('customers')} (customer_id)
        )
      `);

      // Create indexes for better performance
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_customers_email ON ${this.getTableName('customers')} (email)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON ${this.getTableName('customers')} (stripe_customer_id)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_usage_customer_timestamp ON ${this.getTableName('usage_records')} (customer_id, timestamp)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_usage_tool_name ON ${this.getTableName('usage_records')} (tool_name)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON ${this.getTableName('subscriptions')} (customer_id)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON ${this.getTableName('credit_transactions')} (customer_id, timestamp)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON ${this.getTableName('webhook_events')} (status)`);

    } catch (error) {
      throw new DatabaseError(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
        'migrate',
        undefined,
        { originalError: error }
      );
    }
  }

  // Customer operations
  async createCustomer(customerData: Omit<CustomerInfo, 'customerId' | 'createdAt' | 'updatedAt'>): Promise<CustomerInfo> {
    const customerId = uuidv4();
    const now = new Date();

    try {
      await this.db.run(`
        INSERT INTO ${this.getTableName('customers')} (
          customer_id, stripe_customer_id, email, name, metadata,
          subscription_status, plan_id, credits, created_at, updated_at,
          usage_total_calls, usage_current_period_calls, usage_last_call_at,
          usage_total_spent, payment_method_type, payment_method_last4,
          payment_method_brand, payment_method_expiry_month, payment_method_expiry_year,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId,
        customerData.stripeCustomerId || null,
        customerData.email,
        customerData.name || null,
        customerData.metadata ? JSON.stringify(customerData.metadata) : null,
        customerData.subscriptionStatus || null,
        customerData.planId || null,
        customerData.credits || 0,
        now.toISOString(),
        now.toISOString(),
        customerData.usage?.totalCalls || 0,
        customerData.usage?.currentPeriodCalls || 0,
        customerData.usage?.lastCallAt?.toISOString() || null,
        customerData.usage?.totalSpent || 0,
        customerData.paymentMethod?.type || null,
        customerData.paymentMethod?.last4 || null,
        customerData.paymentMethod?.brand || null,
        customerData.paymentMethod?.expiryMonth || null,
        customerData.paymentMethod?.expiryYear || null,
        customerData.status
      ]);

      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new DatabaseError('Failed to create customer', 'createCustomer');
      }

      return customer;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create customer: ${error instanceof Error ? error.message : String(error)}`,
        'createCustomer',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  async getCustomer(customerId: string): Promise<CustomerInfo | null> {
    try {
      const row = await this.db.get(`
        SELECT * FROM ${this.getTableName('customers')} WHERE customer_id = ?
      `, [customerId]);

      return row ? this.mapRowToCustomer(row) : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get customer: ${error instanceof Error ? error.message : String(error)}`,
        'getCustomer',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  async getCustomerByEmail(email: string): Promise<CustomerInfo | null> {
    try {
      const row = await this.db.get(`
        SELECT * FROM ${this.getTableName('customers')} WHERE email = ?
      `, [email]);

      return row ? this.mapRowToCustomer(row) : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get customer by email: ${error instanceof Error ? error.message : String(error)}`,
        'getCustomerByEmail',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<CustomerInfo> {
    const setPairs: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (updates.email !== undefined) {
      setPairs.push('email = ?');
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      setPairs.push('name = ?');
      values.push(updates.name);
    }
    if (updates.metadata !== undefined) {
      setPairs.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.subscriptionStatus !== undefined) {
      setPairs.push('subscription_status = ?');
      values.push(updates.subscriptionStatus);
    }
    if (updates.planId !== undefined) {
      setPairs.push('plan_id = ?');
      values.push(updates.planId);
    }
    if (updates.credits !== undefined) {
      setPairs.push('credits = ?');
      values.push(updates.credits);
    }
    if (updates.status !== undefined) {
      setPairs.push('status = ?');
      values.push(updates.status);
    }

    setPairs.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(customerId);

    try {
      await this.db.run(`
        UPDATE ${this.getTableName('customers')} 
        SET ${setPairs.join(', ')} 
        WHERE customer_id = ?
      `, values);

      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new DatabaseError('Customer not found after update', 'updateCustomer');
      }

      return customer;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update customer: ${error instanceof Error ? error.message : String(error)}`,
        'updateCustomer',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.db.run(`
        DELETE FROM ${this.getTableName('customers')} WHERE customer_id = ?
      `, [customerId]);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete customer: ${error instanceof Error ? error.message : String(error)}`,
        'deleteCustomer',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  async listCustomers(options: { page?: number; limit?: number; status?: string } = {}): Promise<{ customers: CustomerInfo[]; total: number }> {
    const { page = 1, limit = 50, status } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (status) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    try {
      const [rows, countRow] = await Promise.all([
        this.db.all(`
          SELECT * FROM ${this.getTableName('customers')} 
          ${whereClause}
          ORDER BY created_at DESC 
          LIMIT ? OFFSET ?
        `, [...params, limit, offset]),
        this.db.get(`
          SELECT COUNT(*) as total FROM ${this.getTableName('customers')} ${whereClause}
        `, params)
      ]);

      return {
        customers: rows.map(row => this.mapRowToCustomer(row)),
        total: countRow?.total || 0
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to list customers: ${error instanceof Error ? error.message : String(error)}`,
        'listCustomers',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  async updateCustomerCredits(customerId: string, creditChange: number): Promise<void> {
    try {
      await this.db.run(`
        UPDATE ${this.getTableName('customers')} 
        SET credits = credits + ?, updated_at = ?
        WHERE customer_id = ?
      `, [creditChange, new Date().toISOString(), customerId]);
    } catch (error) {
      throw new DatabaseError(
        `Failed to update customer credits: ${error instanceof Error ? error.message : String(error)}`,
        'updateCustomerCredits',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  async updateCustomerUsage(customerId: string, usage: { totalCalls?: number; currentPeriodCalls?: number; lastCallAt?: Date; totalSpent?: number; creditsUsed?: number }): Promise<void> {
    const setPairs: string[] = [];
    const values: any[] = [];

    if (usage.totalCalls !== undefined) {
      setPairs.push('usage_total_calls = usage_total_calls + ?');
      values.push(usage.totalCalls);
    }
    if (usage.currentPeriodCalls !== undefined) {
      setPairs.push('usage_current_period_calls = usage_current_period_calls + ?');
      values.push(usage.currentPeriodCalls);
    }
    if (usage.lastCallAt !== undefined) {
      setPairs.push('usage_last_call_at = ?');
      values.push(usage.lastCallAt.toISOString());
    }
    if (usage.totalSpent !== undefined) {
      setPairs.push('usage_total_spent = usage_total_spent + ?');
      values.push(usage.totalSpent);
    }

    setPairs.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(customerId);

    try {
      await this.db.run(`
        UPDATE ${this.getTableName('customers')} 
        SET ${setPairs.join(', ')}
        WHERE customer_id = ?
      `, values);
    } catch (error) {
      throw new DatabaseError(
        `Failed to update customer usage: ${error instanceof Error ? error.message : String(error)}`,
        'updateCustomerUsage',
        this.getTableName('customers'),
        { originalError: error }
      );
    }
  }

  // Usage tracking methods (implement additional methods as needed)
  async createUsageRecord(record: Omit<UsageRecord, 'id'>): Promise<UsageRecord> {
    const id = uuidv4();

    try {
      await this.db.run(`
        INSERT INTO ${this.getTableName('usage_records')} (
          id, customer_id, tool_name, args, cost, credits, timestamp,
          processing_time, success, error, metadata, billing_period,
          subscription_id, payment_intent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        record.customerId,
        record.toolName,
        JSON.stringify(record.args),
        record.cost,
        record.credits || null,
        record.timestamp.toISOString(),
        record.processingTime || null,
        record.success ? 1 : 0,
        record.error || null,
        record.metadata ? JSON.stringify(record.metadata) : null,
        record.billingPeriod || null,
        record.subscriptionId || null,
        record.paymentIntentId || null
      ]);

      return {
        id,
        ...record
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to create usage record: ${error instanceof Error ? error.message : String(error)}`,
        'createUsageRecord',
        this.getTableName('usage_records'),
        { originalError: error }
      );
    }
  }

  async getUsageRecords(customerId: string, options: { startDate?: Date; endDate?: Date; limit?: number; offset?: number } = {}): Promise<UsageRecord[]> {
    const { startDate, endDate, limit = 100, offset = 0 } = options;
    const params: any[] = [customerId];
    let whereClause = 'WHERE customer_id = ?';

    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(startDate.toISOString());
    }
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(endDate.toISOString());
    }

    params.push(limit, offset);

    try {
      const rows = await this.db.all(`
        SELECT * FROM ${this.getTableName('usage_records')} 
        ${whereClause}
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `, params);

      return rows.map(row => this.mapRowToUsageRecord(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get usage records: ${error instanceof Error ? error.message : String(error)}`,
        'getUsageRecords',
        this.getTableName('usage_records'),
        { originalError: error }
      );
    }
  }

  async getUsageForPeriod(customerId: string, period: 'current' | 'month' | 'day' | 'hour'): Promise<number> {
    let whereClause = 'WHERE customer_id = ?';
    const params = [customerId];

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
        break;
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'current':
      default:
        // For current billing period, we'll use the month for simplicity
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
    }

    whereClause += ' AND timestamp >= ?';
    params.push(startDate.toISOString());

    try {
      const result = await this.db.get(`
        SELECT COUNT(*) as count FROM ${this.getTableName('usage_records')} ${whereClause}
      `, params);

      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get usage for period: ${error instanceof Error ? error.message : String(error)}`,
        'getUsageForPeriod',
        this.getTableName('usage_records'),
        { originalError: error }
      );
    }
  }

  async deleteOldUsageRecords(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.db.run(`
        DELETE FROM ${this.getTableName('usage_records')} 
        WHERE timestamp < ?
      `, [cutoffDate.toISOString()]);

      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete old usage records: ${error instanceof Error ? error.message : String(error)}`,
        'deleteOldUsageRecords',
        this.getTableName('usage_records'),
        { originalError: error }
      );
    }
  }

  // Placeholder implementations for other interface methods
  async createPaymentIntent(paymentIntent: PaymentIntentInfo): Promise<PaymentIntentInfo> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async updatePaymentIntent(paymentIntentId: string, updates: Partial<PaymentIntentInfo>): Promise<void> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentInfo | null> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async createSubscription(subscription: Omit<SubscriptionInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionInfo> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async updateSubscription(subscriptionId: string, updates: Partial<SubscriptionInfo>): Promise<SubscriptionInfo> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getCustomerSubscription(customerId: string): Promise<SubscriptionInfo | null> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async createCreditTransaction(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getCreditTransactions(customerId: string, options?: { limit?: number; offset?: number }): Promise<CreditTransaction[]> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getExpiredCredits(): Promise<CreditTransaction[]> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async createWebhookEvent(event: Omit<WebhookEvent, 'id' | 'createdAt'>): Promise<WebhookEvent> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<void> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getFailedWebhookEvents(): Promise<WebhookEvent[]> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async retryWebhookEvent(eventId: string): Promise<void> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getAnalytics(): Promise<StripeMonetizationStats> {
    // Implementation would go here - would aggregate data from various tables
    throw new Error('Method not implemented');
  }

  async getRevenueStats(startDate?: Date, endDate?: Date): Promise<AnalyticsData['revenue']> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getUsageStats(startDate?: Date, endDate?: Date): Promise<AnalyticsData['usage']> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getCustomerStats(): Promise<AnalyticsData['customers']> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  async getBillingSummary(customerId: string): Promise<BillingSummary> {
    // Implementation would go here
    throw new Error('Method not implemented');
  }

  // Helper methods
  private getTableName(table: string): string {
    const prefix = this.config.tablePrefix || 'mcp_stripe_';
    return `${prefix}${table}`;
  }

  private mapRowToCustomer(row: any): CustomerInfo {
    return {
      customerId: row.customer_id,
      stripeCustomerId: row.stripe_customer_id,
      email: row.email,
      name: row.name,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      subscriptionStatus: row.subscription_status,
      planId: row.plan_id,
      credits: row.credits,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      usage: {
        totalCalls: row.usage_total_calls || 0,
        currentPeriodCalls: row.usage_current_period_calls || 0,
        lastCallAt: row.usage_last_call_at ? new Date(row.usage_last_call_at) : undefined,
        totalSpent: row.usage_total_spent || 0,
      },
      paymentMethod: row.payment_method_type ? {
        type: row.payment_method_type,
        last4: row.payment_method_last4,
        brand: row.payment_method_brand,
        expiryMonth: row.payment_method_expiry_month,
        expiryYear: row.payment_method_expiry_year,
      } : undefined,
      status: row.status,
    };
  }

  private mapRowToUsageRecord(row: any): UsageRecord {
    return {
      id: row.id,
      customerId: row.customer_id,
      toolName: row.tool_name,
      args: JSON.parse(row.args),
      cost: row.cost,
      credits: row.credits,
      timestamp: new Date(row.timestamp),
      processingTime: row.processing_time,
      success: Boolean(row.success),
      error: row.error,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      billingPeriod: row.billing_period,
      subscriptionId: row.subscription_id,
      paymentIntentId: row.payment_intent_id,
    };
  }
}
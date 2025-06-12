/**
 * @file Database Manager - Abstraction Layer for Multiple Database Types
 * @version 1.0.0
 * @description Provides a unified interface for database operations across SQLite, PostgreSQL, and MySQL
 */

import { DatabaseConfig, DatabaseType } from '../../interfaces/config.js';
import {
  CustomerInfo,
  UsageRecord,
  PaymentIntentInfo,
  SubscriptionInfo,
  CreditTransaction,
  AnalyticsData,
  WebhookEvent,
  HealthCheckResult,
  BillingSummary,
  StripeMonetizationStats,
} from '../../interfaces/billing.js';
import {
  DatabaseError,
  CustomerNotFoundError,
  ValidationError,
} from '../../interfaces/errors.js';

import { SqliteAdapter } from './adapters/sqlite.js';
import { PostgresAdapter } from './adapters/postgres.js';
import { MysqlAdapter } from './adapters/mysql.js';

/**
 * Database adapter interface that all database implementations must follow
 */
export interface DatabaseAdapter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
  migrate(): Promise<void>;
  
  // Customer operations
  createCustomer(customer: Omit<CustomerInfo, 'customerId' | 'createdAt' | 'updatedAt'>): Promise<CustomerInfo>;
  getCustomer(customerId: string): Promise<CustomerInfo | null>;
  getCustomerByEmail(email: string): Promise<CustomerInfo | null>;
  updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<CustomerInfo>;
  deleteCustomer(customerId: string): Promise<void>;
  listCustomers(options?: { page?: number; limit?: number; status?: string }): Promise<{ customers: CustomerInfo[]; total: number }>;
  updateCustomerCredits(customerId: string, creditChange: number): Promise<void>;
  updateCustomerUsage(customerId: string, usage: { totalCalls?: number; currentPeriodCalls?: number; lastCallAt?: Date; totalSpent?: number; creditsUsed?: number }): Promise<void>;
  
  // Usage tracking
  createUsageRecord(record: Omit<UsageRecord, 'id'>): Promise<UsageRecord>;
  getUsageRecords(customerId: string, options?: { startDate?: Date; endDate?: Date; limit?: number; offset?: number }): Promise<UsageRecord[]>;
  getUsageForPeriod(customerId: string, period: 'current' | 'month' | 'day' | 'hour'): Promise<number>;
  deleteOldUsageRecords(retentionDays: number): Promise<number>;
  
  // Payment tracking
  createPaymentIntent(paymentIntent: PaymentIntentInfo): Promise<PaymentIntentInfo>;
  updatePaymentIntent(paymentIntentId: string, updates: Partial<PaymentIntentInfo>): Promise<void>;
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentInfo | null>;
  
  // Subscription management
  createSubscription(subscription: Omit<SubscriptionInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionInfo>;
  updateSubscription(subscriptionId: string, updates: Partial<SubscriptionInfo>): Promise<SubscriptionInfo>;
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>;
  getCustomerSubscription(customerId: string): Promise<SubscriptionInfo | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  
  // Credit transactions
  createCreditTransaction(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction>;
  getCreditTransactions(customerId: string, options?: { limit?: number; offset?: number }): Promise<CreditTransaction[]>;
  getExpiredCredits(): Promise<CreditTransaction[]>;
  
  // Webhook events
  createWebhookEvent(event: Omit<WebhookEvent, 'id' | 'createdAt'>): Promise<WebhookEvent>;
  updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<void>;
  getFailedWebhookEvents(): Promise<WebhookEvent[]>;
  retryWebhookEvent(eventId: string): Promise<void>;
  
  // Analytics
  getAnalytics(): Promise<StripeMonetizationStats>;
  getRevenueStats(startDate?: Date, endDate?: Date): Promise<AnalyticsData['revenue']>;
  getUsageStats(startDate?: Date, endDate?: Date): Promise<AnalyticsData['usage']>;
  getCustomerStats(): Promise<AnalyticsData['customers']>;
  
  // Billing
  getBillingSummary(customerId: string): Promise<BillingSummary>;
}

/**
 * Main database manager that delegates to the appropriate adapter
 */
export class DatabaseManager implements DatabaseAdapter {
  private adapter!: DatabaseAdapter;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize the database manager and create the appropriate adapter
   */
  async initialize(): Promise<void> {
    try {
      // Create the appropriate adapter based on database type
      switch (this.config.type) {
        case 'sqlite':
          this.adapter = new SqliteAdapter(this.config);
          break;
        case 'postgresql':
          this.adapter = new PostgresAdapter(this.config);
          break;
        case 'mysql':
          this.adapter = new MysqlAdapter(this.config);
          break;
        default:
          throw new DatabaseError(
            `Unsupported database type: ${this.config.type}`,
            'initialize'
          );
      }

      // Initialize the adapter
      await this.adapter.initialize();

      // Run migrations if enabled
      if (this.config.autoMigrate) {
        await this.adapter.migrate();
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
        'initialize',
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close();
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.adapter) {
      return false;
    }
    return await this.adapter.healthCheck();
  }

  /**
   * Run database migrations
   */
  async migrate(): Promise<void> {
    if (!this.adapter) {
      throw new DatabaseError('Database not initialized', 'migrate');
    }
    await this.adapter.migrate();
  }

  // Customer operations
  async createCustomer(customer: Omit<CustomerInfo, 'customerId' | 'createdAt' | 'updatedAt'>): Promise<CustomerInfo> {
    this.validateCustomerData(customer);
    return await this.adapter.createCustomer(customer);
  }

  async getCustomer(customerId: string): Promise<CustomerInfo | null> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    return await this.adapter.getCustomer(customerId);
  }

  async getCustomerByEmail(email: string): Promise<CustomerInfo | null> {
    if (!email) {
      throw new ValidationError('Email is required', [
        { field: 'email', message: 'Required field is missing' }
      ]);
    }
    return await this.adapter.getCustomerByEmail(email);
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<CustomerInfo> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    // Validate update data
    this.validateCustomerUpdateData(updates);
    
    return await this.adapter.updateCustomer(customerId, updates);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    const customer = await this.adapter.getCustomer(customerId);
    if (!customer) {
      throw new CustomerNotFoundError('Customer not found', customerId);
    }
    
    await this.adapter.deleteCustomer(customerId);
  }

  async listCustomers(options?: { page?: number; limit?: number; status?: string }): Promise<{ customers: CustomerInfo[]; total: number }> {
    return await this.adapter.listCustomers(options);
  }

  async updateCustomerCredits(customerId: string, creditChange: number): Promise<void> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    await this.adapter.updateCustomerCredits(customerId, creditChange);
  }

  async updateCustomerUsage(customerId: string, usage: { totalCalls?: number; currentPeriodCalls?: number; lastCallAt?: Date; totalSpent?: number; creditsUsed?: number }): Promise<void> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    await this.adapter.updateCustomerUsage(customerId, usage);
  }

  // Usage tracking
  async createUsageRecord(record: Omit<UsageRecord, 'id'>): Promise<UsageRecord> {
    this.validateUsageRecord(record);
    return await this.adapter.createUsageRecord(record);
  }

  async getUsageRecords(customerId: string, options?: { startDate?: Date; endDate?: Date; limit?: number; offset?: number }): Promise<UsageRecord[]> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.getUsageRecords(customerId, options);
  }

  async getUsageForPeriod(customerId: string, period: 'current' | 'month' | 'day' | 'hour'): Promise<number> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.getUsageForPeriod(customerId, period);
  }

  async deleteOldUsageRecords(retentionDays: number): Promise<number> {
    if (retentionDays < 1) {
      throw new ValidationError('Retention days must be at least 1', [
        { field: 'retentionDays', message: 'Must be at least 1' }
      ]);
    }
    
    return await this.adapter.deleteOldUsageRecords(retentionDays);
  }

  // Payment tracking
  async createPaymentIntent(paymentIntent: PaymentIntentInfo): Promise<PaymentIntentInfo> {
    this.validatePaymentIntent(paymentIntent);
    return await this.adapter.createPaymentIntent(paymentIntent);
  }

  async updatePaymentIntent(paymentIntentId: string, updates: Partial<PaymentIntentInfo>): Promise<void> {
    if (!paymentIntentId) {
      throw new ValidationError('Payment intent ID is required', [
        { field: 'paymentIntentId', message: 'Required field is missing' }
      ]);
    }
    
    await this.adapter.updatePaymentIntent(paymentIntentId, updates);
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentInfo | null> {
    if (!paymentIntentId) {
      throw new ValidationError('Payment intent ID is required', [
        { field: 'paymentIntentId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.getPaymentIntent(paymentIntentId);
  }

  // Subscription management
  async createSubscription(subscription: Omit<SubscriptionInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionInfo> {
    this.validateSubscription(subscription);
    return await this.adapter.createSubscription(subscription);
  }

  async updateSubscription(subscriptionId: string, updates: Partial<SubscriptionInfo>): Promise<SubscriptionInfo> {
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required', [
        { field: 'subscriptionId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.updateSubscription(subscriptionId, updates);
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required', [
        { field: 'subscriptionId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.getSubscription(subscriptionId);
  }

  async getCustomerSubscription(customerId: string): Promise<SubscriptionInfo | null> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.getCustomerSubscription(customerId);
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required', [
        { field: 'subscriptionId', message: 'Required field is missing' }
      ]);
    }
    
    await this.adapter.cancelSubscription(subscriptionId);
  }

  // Credit transactions
  async createCreditTransaction(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction> {
    this.validateCreditTransaction(transaction);
    return await this.adapter.createCreditTransaction(transaction);
  }

  async getCreditTransactions(customerId: string, options?: { limit?: number; offset?: number }): Promise<CreditTransaction[]> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.getCreditTransactions(customerId, options);
  }

  async getExpiredCredits(): Promise<CreditTransaction[]> {
    return await this.adapter.getExpiredCredits();
  }

  // Webhook events
  async createWebhookEvent(event: Omit<WebhookEvent, 'id' | 'createdAt'>): Promise<WebhookEvent> {
    this.validateWebhookEvent(event);
    return await this.adapter.createWebhookEvent(event);
  }

  async updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<void> {
    if (!eventId) {
      throw new ValidationError('Event ID is required', [
        { field: 'eventId', message: 'Required field is missing' }
      ]);
    }
    
    await this.adapter.updateWebhookEvent(eventId, updates);
  }

  async getFailedWebhookEvents(): Promise<WebhookEvent[]> {
    return await this.adapter.getFailedWebhookEvents();
  }

  async retryWebhookEvent(eventId: string): Promise<void> {
    if (!eventId) {
      throw new ValidationError('Event ID is required', [
        { field: 'eventId', message: 'Required field is missing' }
      ]);
    }
    
    await this.adapter.retryWebhookEvent(eventId);
  }

  // Analytics
  async getAnalytics(): Promise<StripeMonetizationStats> {
    return await this.adapter.getAnalytics();
  }

  async getRevenueStats(startDate?: Date, endDate?: Date): Promise<AnalyticsData['revenue']> {
    return await this.adapter.getRevenueStats(startDate, endDate);
  }

  async getUsageStats(startDate?: Date, endDate?: Date): Promise<AnalyticsData['usage']> {
    return await this.adapter.getUsageStats(startDate, endDate);
  }

  async getCustomerStats(): Promise<AnalyticsData['customers']> {
    return await this.adapter.getCustomerStats();
  }

  // Billing
  async getBillingSummary(customerId: string): Promise<BillingSummary> {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', [
        { field: 'customerId', message: 'Required field is missing' }
      ]);
    }
    
    return await this.adapter.getBillingSummary(customerId);
  }

  // Validation methods
  private validateCustomerData(customer: any): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!customer.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!customer.status) {
      errors.push({ field: 'status', message: 'Status is required' });
    } else if (!['active', 'suspended', 'deleted'].includes(customer.status)) {
      errors.push({ field: 'status', message: 'Invalid status value' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Customer validation failed', errors);
    }
  }

  private validateCustomerUpdateData(updates: any): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (updates.status && !['active', 'suspended', 'deleted'].includes(updates.status)) {
      errors.push({ field: 'status', message: 'Invalid status value' });
    }

    if (updates.credits !== undefined && (typeof updates.credits !== 'number' || updates.credits < 0)) {
      errors.push({ field: 'credits', message: 'Credits must be a non-negative number' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Customer update validation failed', errors);
    }
  }

  private validateUsageRecord(record: any): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!record.customerId) {
      errors.push({ field: 'customerId', message: 'Customer ID is required' });
    }

    if (!record.toolName) {
      errors.push({ field: 'toolName', message: 'Tool name is required' });
    }

    if (typeof record.cost !== 'number' || record.cost < 0) {
      errors.push({ field: 'cost', message: 'Cost must be a non-negative number' });
    }

    if (record.credits !== undefined && (typeof record.credits !== 'number' || record.credits < 0)) {
      errors.push({ field: 'credits', message: 'Credits must be a non-negative number' });
    }

    if (!record.timestamp || !(record.timestamp instanceof Date)) {
      errors.push({ field: 'timestamp', message: 'Valid timestamp is required' });
    }

    if (typeof record.success !== 'boolean') {
      errors.push({ field: 'success', message: 'Success field must be a boolean' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Usage record validation failed', errors);
    }
  }

  private validatePaymentIntent(paymentIntent: any): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!paymentIntent.paymentIntentId) {
      errors.push({ field: 'paymentIntentId', message: 'Payment intent ID is required' });
    }

    if (typeof paymentIntent.amount !== 'number' || paymentIntent.amount <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be a positive number' });
    }

    if (!paymentIntent.currency) {
      errors.push({ field: 'currency', message: 'Currency is required' });
    }

    if (!paymentIntent.customerId) {
      errors.push({ field: 'customerId', message: 'Customer ID is required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Payment intent validation failed', errors);
    }
  }

  private validateSubscription(subscription: any): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!subscription.stripeSubscriptionId) {
      errors.push({ field: 'stripeSubscriptionId', message: 'Stripe subscription ID is required' });
    }

    if (!subscription.customerId) {
      errors.push({ field: 'customerId', message: 'Customer ID is required' });
    }

    if (!subscription.planId) {
      errors.push({ field: 'planId', message: 'Plan ID is required' });
    }

    if (!subscription.status || !['active', 'canceled', 'past_due', 'trialing', 'incomplete'].includes(subscription.status)) {
      errors.push({ field: 'status', message: 'Valid status is required' });
    }

    if (!subscription.currentPeriodStart || !(subscription.currentPeriodStart instanceof Date)) {
      errors.push({ field: 'currentPeriodStart', message: 'Valid current period start date is required' });
    }

    if (!subscription.currentPeriodEnd || !(subscription.currentPeriodEnd instanceof Date)) {
      errors.push({ field: 'currentPeriodEnd', message: 'Valid current period end date is required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Subscription validation failed', errors);
    }
  }

  private validateCreditTransaction(transaction: any): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!transaction.customerId) {
      errors.push({ field: 'customerId', message: 'Customer ID is required' });
    }

    if (!transaction.type || !['purchase', 'consumption', 'refund', 'bonus', 'expiry'].includes(transaction.type)) {
      errors.push({ field: 'type', message: 'Valid transaction type is required' });
    }

    if (typeof transaction.amount !== 'number') {
      errors.push({ field: 'amount', message: 'Amount must be a number' });
    }

    if (typeof transaction.balanceAfter !== 'number' || transaction.balanceAfter < 0) {
      errors.push({ field: 'balanceAfter', message: 'Balance after must be a non-negative number' });
    }

    if (!transaction.description) {
      errors.push({ field: 'description', message: 'Description is required' });
    }

    if (!transaction.timestamp || !(transaction.timestamp instanceof Date)) {
      errors.push({ field: 'timestamp', message: 'Valid timestamp is required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Credit transaction validation failed', errors);
    }
  }

  private validateWebhookEvent(event: any): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!event.type) {
      errors.push({ field: 'type', message: 'Event type is required' });
    }

    if (!event.data) {
      errors.push({ field: 'data', message: 'Event data is required' });
    }

    if (!event.status || !['pending', 'processed', 'failed', 'retrying'].includes(event.status)) {
      errors.push({ field: 'status', message: 'Valid status is required' });
    }

    if (typeof event.retryCount !== 'number' || event.retryCount < 0) {
      errors.push({ field: 'retryCount', message: 'Retry count must be a non-negative number' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Webhook event validation failed', errors);
    }
  }
}
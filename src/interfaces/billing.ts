/**
 * @file Billing-related interfaces and types
 * @version 1.0.0
 */

/**
 * Billing context for processing payments
 */
export interface BillingContext {
  /** User identifier */
  userId: string;
  /** Tool being called */
  toolName: string;
  /** Tool arguments */
  args: Record<string, any>;
  /** Billing model being used */
  billingModel: string;
  /** Request metadata */
  metadata?: Record<string, any>;
}

/**
 * Payment processing result
 */
export interface PaymentResult {
  /** Whether payment was successful */
  success: boolean;
  /** Payment amount in cents */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Stripe payment intent ID */
  paymentIntentId?: string;
  /** Error message if payment failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Usage record for tracking tool calls
 */
export interface UsageRecord {
  /** Unique record ID */
  id: string;
  /** User ID */
  userId: string;
  /** Tool name */
  toolName: string;
  /** Amount charged in cents */
  amount: number;
  /** Currency code */
  currency: string;
  /** Whether the tool call was successful */
  success: boolean;
  /** Timestamp of the call */
  timestamp: Date;
  /** Request metadata */
  metadata?: Record<string, any>;
}

/**
 * Customer information
 */
export interface CustomerInfo {
  /** Customer ID */
  id: string;
  /** Email address */
  email?: string;
  /** Display name */
  name?: string;
  /** Stripe customer ID */
  stripeCustomerId?: string;
  /** Current subscription info */
  subscription?: SubscriptionInfo;
  /** Credit balance (for credit system) */
  creditBalance?: CreditBalance;
  /** Creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivity?: Date;
}

/**
 * Subscription information
 */
export interface SubscriptionInfo {
  /** Subscription ID */
  id: string;
  /** Plan ID */
  planId: string;
  /** Stripe subscription ID */
  stripeSubscriptionId: string;
  /** Subscription status */
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  /** Current period start */
  currentPeriodStart: Date;
  /** Current period end */
  currentPeriodEnd: Date;
  /** Calls used this period */
  callsUsed: number;
  /** Calls included in plan */
  callsIncluded: number;
  /** Trial end date (if applicable) */
  trialEnd?: Date;
}

/**
 * Credit balance information
 */
export interface CreditBalance {
  /** Available credits */
  available: number;
  /** Total credits purchased */
  totalPurchased: number;
  /** Total credits used */
  totalUsed: number;
  /** Credits that will expire soon */
  expiringCredits?: Array<{
    amount: number;
    expiresAt: Date;
  }>;
  /** Last credit purchase */
  lastPurchase?: {
    amount: number;
    price: number;
    purchasedAt: Date;
  };
}

/**
 * Payment intent information for tracking Stripe payments
 */
export interface PaymentIntentInfo {
  /** Payment intent ID from Stripe */
  id: string;
  /** Customer ID */
  customerId: string;
  /** Amount in cents */
  amount: number;
  /** Currency code */
  currency: string;
  /** Payment status */
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  /** Creation timestamp */
  createdAt: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Associated metadata */
  metadata?: Record<string, any>;
}

/**
 * Credit transaction record
 */
export interface CreditTransaction {
  /** Transaction ID */
  id: string;
  /** Customer ID */
  customerId: string;
  /** Transaction type */
  type: 'purchase' | 'usage' | 'refund' | 'adjustment';
  /** Credit amount (positive for additions, negative for usage) */
  amount: number;
  /** Cost in cents (for purchases) */
  cost?: number;
  /** Currency code */
  currency: string;
  /** Associated tool name (for usage) */
  toolName?: string;
  /** Description of transaction */
  description?: string;
  /** Transaction timestamp */
  timestamp: Date;
  /** Reference to payment intent (for purchases) */
  paymentIntentId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  /** Period start date */
  periodStart: Date;
  /** Period end date */
  periodEnd: Date;
  /** Total revenue in cents */
  totalRevenue: number;
  /** Total tool calls */
  totalCalls: number;
  /** Unique active customers */
  activeCustomers: number;
  /** Revenue by tool */
  revenueByTool: Record<string, number>;
  /** Calls by tool */
  callsByTool: Record<string, number>;
  /** Average revenue per call */
  averageRevenuePerCall: number;
  /** Customer acquisition data */
  newCustomers: number;
  /** Churn rate */
  churnRate?: number;
}

/**
 * Webhook event record
 */
export interface WebhookEvent {
  /** Webhook event ID */
  id: string;
  /** Stripe event ID */
  stripeEventId: string;
  /** Event type */
  type: string;
  /** Event data */
  data: Record<string, any>;
  /** Processing status */
  status: 'pending' | 'processed' | 'failed';
  /** Received timestamp */
  receivedAt: Date;
  /** Processed timestamp */
  processedAt?: Date;
  /** Error message if failed */
  error?: string;
  /** Retry count */
  retryCount: number;
}

/**
 * Billing summary information
 */
export interface BillingSummary {
  /** Customer ID */
  customerId: string;
  /** Period start */
  periodStart: Date;
  /** Period end */
  periodEnd: Date;
  /** Total calls made */
  totalCalls: number;
  /** Total amount charged */
  totalCharged: number;
  /** Currency code */
  currency: string;
  /** Subscription info if applicable */
  subscription?: {
    planId: string;
    status: string;
    callsIncluded: number;
    callsUsed: number;
    overageAmount: number;
  };
  /** Credit info if applicable */
  credits?: {
    startBalance: number;
    endBalance: number;
    creditsUsed: number;
    creditsPurchased: number;
  };
}

/**
 * Stripe monetization plugin statistics
 */
export interface StripeMonetizationStats {
  /** Plugin name */
  pluginName: string;
  /** Version */
  version: string;
  /** Total revenue processed */
  totalRevenue: number;
  /** Total transactions */
  totalTransactions: number;
  /** Total customers */
  totalCustomers: number;
  /** Active subscriptions */
  activeSubscriptions: number;
  /** Failed payments */
  failedPayments: number;
  /** Average transaction value */
  averageTransactionValue: number;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Performance metrics */
  performance: {
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}
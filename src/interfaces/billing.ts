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
 * Billing analytics data
 */
export interface BillingAnalytics {
  /** Total revenue in cents */
  totalRevenue: number;
  /** Revenue this month */
  monthlyRevenue: number;
  /** Total customers */
  totalCustomers: number;
  /** Active customers */
  activeCustomers: number;
  /** Total tool calls */
  totalCalls: number;
  /** Calls this month */
  monthlyCalls: number;
  /** Average revenue per user */
  averageRevenuePerUser: number;
  /** Most popular tools */
  popularTools: Array<{
    toolName: string;
    callCount: number;
    revenue: number;
  }>;
  /** Revenue by billing model */
  revenueByModel: Record<string, number>;
  /** Customer churn rate */
  churnRate?: number;
}
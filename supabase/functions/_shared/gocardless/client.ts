/**
 * GoCardless API Client
 * Multi-tenant aware, with environment switching and safe logging
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from './crypto.ts';

export type GoCardlessEnvironment = 'sandbox' | 'live';

export interface GoCardlessConnection {
  id: string;
  company_id: string;
  environment: GoCardlessEnvironment;
  access_token_encrypted: string | null;
  organisation_id: string | null;
  status: string;
  verification_status: string | null;
  verification_checked_at: string | null;
}

interface GoCardlessClientConfig {
  accessToken: string;
  environment: GoCardlessEnvironment;
  companyId: string;
  organisationId?: string;
}

export class GoCardlessClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly companyId: string;
  private readonly organisationId?: string;
  private readonly environment: GoCardlessEnvironment;
  
  private static readonly API_VERSION = '2015-07-06';
  
  constructor(config: GoCardlessClientConfig) {
    this.accessToken = config.accessToken;
    this.environment = config.environment;
    this.companyId = config.companyId;
    this.organisationId = config.organisationId;
    
    this.baseUrl = config.environment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';
  }
  
  /**
   * Create a client from a tenant's connection
   */
  static async fromConnection(
    supabase: SupabaseClient,
    companyId: string
  ): Promise<GoCardlessClient> {
    const { data: connection, error } = await supabase
      .from('gocardless_connections')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error) {
      throw new Error(`Failed to load GoCardless connection: ${error.message}`);
    }
    
    if (!connection) {
      throw new Error(`No active GoCardless connection found for company ${safeCompanyId(companyId)}`);
    }
    
    if (!connection.access_token_encrypted) {
      throw new Error('GoCardless connection has no access token');
    }
    
    const accessToken = await decryptToken(connection.access_token_encrypted);
    
    return new GoCardlessClient({
      accessToken,
      environment: connection.environment as GoCardlessEnvironment,
      companyId: connection.company_id,
      organisationId: connection.organisation_id || undefined
    });
  }
  
  /**
   * Make authenticated request to GoCardless API
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'GoCardless-Version': GoCardlessClient.API_VERSION,
      'Content-Type': 'application/json',
    };
    
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    // Safe logging - never log tokens
    console.log(`[GoCardless] ${method} ${endpoint}`, {
      companyId: safeCompanyId(this.companyId),
      environment: this.environment,
      hasIdempotencyKey: !!idempotencyKey
    });
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      let parsedError: unknown;
      try {
        parsedError = JSON.parse(errorBody);
      } catch {
        parsedError = errorBody;
      }
      
      // Safe error logging - truncate potentially sensitive data
      console.error(`[GoCardless] Error ${response.status}`, {
        endpoint,
        status: response.status,
        requestId: extractRequestId(parsedError),
        errorType: extractErrorType(parsedError)
      });
      
      throw new GoCardlessApiError(response.status, parsedError);
    }
    
    return await response.json() as T;
  }
  
  // Convenience methods
  async getCustomer(customerId: string) {
    return this.request<{ customers: Record<string, unknown> }>('GET', `/customers/${customerId}`);
  }
  
  async createBillingRequest(mandateRequest: Record<string, unknown>, metadata?: Record<string, string>) {
    return this.request<{ billing_requests: Record<string, unknown> }>('POST', '/billing_requests', {
      billing_requests: {
        mandate_request: mandateRequest,
        metadata
      }
    });
  }
  
  async getBillingRequest(billingRequestId: string) {
    return this.request<{ billing_requests: Record<string, unknown> }>('GET', `/billing_requests/${billingRequestId}`);
  }
  
  async createBillingRequestFlow(billingRequestId: string, customerId: string, redirectUri: string, exitUri: string) {
    return this.request<{ billing_request_flows: Record<string, unknown> }>('POST', '/billing_request_flows', {
      billing_request_flows: {
        redirect_uri: redirectUri,
        exit_uri: exitUri,
        links: {
          billing_request: billingRequestId,
          customer: customerId
        },
        lock_customer_details: false,
        lock_bank_account: false,
        show_redirect_buttons: true,
        show_success_redirect_button: true
      }
    });
  }
  
  async createCustomer(customerData: {
    email: string;
    given_name: string;
    family_name: string;
    company_name?: string;
    address_line1?: string;
    city?: string;
    postal_code?: string;
    country_code: string;
    metadata?: Record<string, string>;
  }) {
    return this.request<{ customers: Record<string, unknown> }>('POST', '/customers', {
      customers: customerData
    });
  }
  
  async getMandate(mandateId: string) {
    return this.request<{ mandates: Record<string, unknown> }>('GET', `/mandates/${mandateId}`);
  }
  
  async listMandates(params?: { customer?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.customer) queryParams.set('customer', params.customer);
    if (params?.status) queryParams.set('status', params.status);
    const query = queryParams.toString();
    return this.request<{ mandates: Record<string, unknown>[] }>('GET', `/mandates${query ? `?${query}` : ''}`);
  }
  
  async createSubscription(
    mandateId: string,
    amountCents: number,
    currency: string,
    intervalUnit: 'weekly' | 'monthly' | 'yearly',
    dayOfMonth: number,
    startDate: string,
    metadata?: Record<string, string>,
    idempotencyKey?: string
  ) {
    return this.request<{ subscriptions: Record<string, unknown> }>('POST', '/subscriptions', {
      subscriptions: {
        amount: amountCents,
        currency,
        interval_unit: intervalUnit,
        interval: 1,
        day_of_month: dayOfMonth,
        start_date: startDate,
        links: { mandate: mandateId },
        metadata
      }
    }, idempotencyKey);
  }
  
  async getPayment(paymentId: string) {
    return this.request<{ payments: Record<string, unknown> }>('GET', `/payments/${paymentId}`);
  }
  
  async listPayments(params?: { mandate?: string; subscription?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.mandate) queryParams.set('mandate', params.mandate);
    if (params?.subscription) queryParams.set('subscription', params.subscription);
    if (params?.status) queryParams.set('status', params.status);
    const query = queryParams.toString();
    return this.request<{ payments: Record<string, unknown>[] }>('GET', `/payments${query ? `?${query}` : ''}`);
  }
  
  async getCreditor() {
    const response = await this.request<{ creditors: Record<string, unknown>[] }>('GET', '/creditors');
    return response.creditors[0];
  }
  
  get companyIdValue(): string {
    return this.companyId;
  }
  
  get environmentValue(): GoCardlessEnvironment {
    return this.environment;
  }
}

export class GoCardlessApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown
  ) {
    const errorType = extractErrorType(body);
    super(`GoCardless API error: ${status} ${errorType}`);
    this.name = 'GoCardlessApiError';
  }
  
  get requestId(): string | undefined {
    return extractRequestId(this.body);
  }
}

// Helper functions for safe logging
function safeCompanyId(companyId: string): string {
  if (!companyId || companyId.length < 8) return '***';
  return `${companyId.substring(0, 8)}...`;
}

function extractRequestId(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === 'object' && obj.error !== null) {
      const error = obj.error as Record<string, unknown>;
      if (typeof error.request_id === 'string') {
        return error.request_id;
      }
    }
  }
  return undefined;
}

function extractErrorType(body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === 'object' && obj.error !== null) {
      const error = obj.error as Record<string, unknown>;
      if (typeof error.type === 'string') {
        return error.type;
      }
      if (typeof error.message === 'string') {
        // Truncate message for logging
        return error.message.substring(0, 50);
      }
    }
  }
  return 'unknown';
}

/**
 * Get OAuth URLs for the tenant's environment
 */
export function getOAuthUrls(environment: GoCardlessEnvironment) {
  const connectBase = environment === 'live'
    ? 'https://connect.gocardless.com'
    : 'https://connect-sandbox.gocardless.com';
  
  const apiBase = environment === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com';
  
  return {
    authorizeUrl: `${connectBase}/oauth/authorize`,
    tokenUrl: `${apiBase}/oauth/access_token`,
    apiBase
  };
}

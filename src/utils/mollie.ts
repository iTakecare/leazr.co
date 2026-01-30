import { supabase } from "@/integrations/supabase/client";

export interface MollieCustomerData {
  name: string;
  email: string;
  contract_id?: string;
  company_id?: string;
}

export interface MollieMandateData {
  customer_id: string;
  amount?: number;
  currency?: string;
  description?: string;
  contract_id?: string;
  company_id?: string;
}

export interface MollieDirectMandateData {
  customer_id: string;
  consumer_name: string;
  iban: string;
  bic?: string;
  contract_id?: string;
  company_id?: string;
}

export interface MollieSubscriptionData {
  customer_id: string;
  amount: number;
  currency?: string;
  interval?: string; // e.g., "1 month"
  times?: number; // Number of payments
  start_date?: string; // YYYY-MM-DD
  description?: string;
  contract_id?: string;
  company_id?: string;
}

export interface MolliePaymentData {
  customer_id: string;
  mandate_id?: string;
  amount: number;
  currency?: string;
  description?: string;
  contract_id?: string;
  company_id?: string;
}

export interface MollieResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  status?: number;
}

/**
 * Create a customer in Mollie
 */
export async function createMollieCustomer(
  data: MollieCustomerData
): Promise<MollieResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "create_customer",
        name: data.name,
        email: data.email,
        contract_id: data.contract_id,
        company_id: data.company_id,
      },
    });

    if (error) {
      console.error("[Mollie] Create customer error:", error);
      return { success: false, error: error.message };
    }

    return result;
  } catch (error) {
    console.error("[Mollie] Create customer exception:", error);
    return { success: false, error: "Erreur lors de la création du client" };
  }
}

/**
 * Get customer details from Mollie
 */
export async function getMollieCustomer(customerId: string): Promise<MollieResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "get_customer",
        customer_id: customerId,
      },
    });

    if (error) {
      console.error("[Mollie] Get customer error:", error);
      return { success: false, error: error.message };
    }

    return result;
  } catch (error) {
    console.error("[Mollie] Get customer exception:", error);
    return { success: false, error: "Erreur lors de la récupération du client" };
  }
}

/**
 * Create a SEPA Direct Debit mandate via first payment
 * Returns a redirect URL for the customer to authorize
 */
export async function createMollieMandate(
  data: MollieMandateData
): Promise<MollieResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "create_mandate",
        customer_id: data.customer_id,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        contract_id: data.contract_id,
        company_id: data.company_id,
      },
    });

    if (error) {
      console.error("[Mollie] Create mandate error:", error);
      return { success: false, error: error.message };
    }

    return result;
  } catch (error) {
    console.error("[Mollie] Create mandate exception:", error);
    return { success: false, error: "Erreur lors de la création du mandat" };
  }
}

/**
 * List mandates for a customer
 */
export async function listMollieMandates(customerId: string): Promise<MollieResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "list_mandates",
        customer_id: customerId,
      },
    });

    if (error) {
      console.error("[Mollie] List mandates error:", error);
      return { success: false, error: error.message };
    }

    return result;
  } catch (error) {
    console.error("[Mollie] List mandates exception:", error);
    return { success: false, error: "Erreur lors de la récupération des mandats" };
  }
}

/**
 * Create a direct SEPA mandate with IBAN (no checkout redirect)
 * This creates the mandate immediately without customer interaction
 */
export async function createDirectMollieMandate(
  data: MollieDirectMandateData
): Promise<MollieResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "create_direct_mandate",
        customer_id: data.customer_id,
        consumer_name: data.consumer_name,
        iban: data.iban,
        bic: data.bic,
        contract_id: data.contract_id,
        company_id: data.company_id,
      },
    });

    if (error) {
      console.error("[Mollie] Create direct mandate error:", error);
      return { success: false, error: error.message };
    }

    return result;
  } catch (error) {
    console.error("[Mollie] Create direct mandate exception:", error);
    return { success: false, error: "Erreur lors de la création du mandat SEPA" };
  }
}

/**
 * Full SEPA setup flow with direct IBAN:
 * 1. Create customer
 * 2. Create direct mandate with IBAN
 * Returns the mandate immediately (no redirect needed)
 */
export async function setupMollieSepaWithIban(
  customerData: MollieCustomerData,
  mandateData: { consumer_name: string; iban: string; bic?: string; contract_id?: string; company_id?: string }
): Promise<{ success: boolean; customerId?: string; mandateId?: string; mandateStatus?: string; error?: string }> {
  try {
    // Step 1: Create customer
    const customerResult = await createMollieCustomer(customerData);
    if (!customerResult.success || !customerResult.data) {
      return { success: false, error: customerResult.error || "Erreur création client" };
    }

    const customer = customerResult.data as { id: string };
    const customerId = customer.id;

    // Step 2: Create direct mandate with IBAN
    const mandateResult = await createDirectMollieMandate({
      customer_id: customerId,
      consumer_name: mandateData.consumer_name,
      iban: mandateData.iban,
      bic: mandateData.bic,
      contract_id: mandateData.contract_id,
      company_id: mandateData.company_id,
    });

    if (!mandateResult.success || !mandateResult.data) {
      return { success: false, error: mandateResult.error || "Erreur création mandat" };
    }

    const mandate = mandateResult.data as { id: string; status: string };

    return { 
      success: true, 
      customerId, 
      mandateId: mandate.id,
      mandateStatus: mandate.status
    };
  } catch (error) {
    console.error("[Mollie] Setup SEPA with IBAN error:", error);
    return { success: false, error: "Erreur lors de la configuration SEPA" };
  }
}

/**
 * Create a recurring subscription
 */
export async function createMollieSubscription(
  data: MollieSubscriptionData
): Promise<MollieResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "create_subscription",
        customer_id: data.customer_id,
        amount: data.amount,
        currency: data.currency,
        interval: data.interval,
        times: data.times,
        start_date: data.start_date,
        description: data.description,
        contract_id: data.contract_id,
        company_id: data.company_id,
      },
    });

    if (error) {
      console.error("[Mollie] Create subscription error:", error);
      return { success: false, error: error.message };
    }

    return result;
  } catch (error) {
    console.error("[Mollie] Create subscription exception:", error);
    return { success: false, error: "Erreur lors de la création de l'abonnement" };
  }
}

/**
 * Create a single recurring payment
 */
export async function createMolliePayment(
  data: MolliePaymentData
): Promise<MollieResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "create_payment",
        customer_id: data.customer_id,
        mandate_id: data.mandate_id,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        contract_id: data.contract_id,
        company_id: data.company_id,
      },
    });

    if (error) {
      console.error("[Mollie] Create payment error:", error);
      return { success: false, error: error.message };
    }

    return result;
  } catch (error) {
    console.error("[Mollie] Create payment exception:", error);
    return { success: false, error: "Erreur lors de la création du paiement" };
  }
}

/**
 * Full SEPA setup flow:
 * 1. Create customer
 * 2. Create mandate (first payment)
 * Returns redirect URL for customer authorization
 */
export async function setupMollieSepa(
  customerData: MollieCustomerData,
  mandateData: Omit<MollieMandateData, "customer_id">
): Promise<{ success: boolean; redirectUrl?: string; customerId?: string; error?: string }> {
  try {
    // Step 1: Create customer
    const customerResult = await createMollieCustomer(customerData);
    if (!customerResult.success || !customerResult.data) {
      return { success: false, error: customerResult.error || "Erreur création client" };
    }

    const customer = customerResult.data as { id: string };
    const customerId = customer.id;

    // Step 2: Create mandate via first payment
    const mandateResult = await createMollieMandate({
      ...mandateData,
      customer_id: customerId,
    });

    if (!mandateResult.success || !mandateResult.data) {
      return { success: false, error: mandateResult.error || "Erreur création mandat" };
    }

    const payment = mandateResult.data as { _links?: { checkout?: { href: string } } };
    const redirectUrl = payment._links?.checkout?.href;

    if (!redirectUrl) {
      return { success: false, error: "URL de redirection non disponible" };
    }

    return { success: true, redirectUrl, customerId };
  } catch (error) {
    console.error("[Mollie] Setup SEPA error:", error);
    return { success: false, error: "Erreur lors de la configuration SEPA" };
  }
}

export interface MollieSepaCompleteData {
  name: string;
  email: string;
  consumer_name: string;
  iban: string;
  bic?: string;
  amount: number;
  times: number;
  currency?: string;
  interval?: string;
  start_date?: string;
  description?: string;
  contract_id?: string;
  company_id?: string;
}

export interface MollieSepaCompleteResponse {
  success: boolean;
  customerId?: string;
  mandateId?: string;
  mandateStatus?: string;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  firstPaymentDate?: string | null;
  subscriptionError?: string | null;
  error?: string;
}

/**
 * Complete SEPA setup flow with direct IBAN:
 * 1. Create customer
 * 2. Create direct mandate with IBAN
 * 3. Create recurring subscription
 * All in a single API call - no redirect needed
 */
export async function setupMollieSepaComplete(
  data: MollieSepaCompleteData
): Promise<MollieSepaCompleteResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "setup_sepa_complete",
        name: data.name,
        email: data.email,
        consumer_name: data.consumer_name,
        iban: data.iban,
        bic: data.bic,
        amount: data.amount,
        times: data.times,
        currency: data.currency,
        interval: data.interval,
        start_date: data.start_date,
        description: data.description,
        contract_id: data.contract_id,
        company_id: data.company_id,
      },
    });

    if (error) {
      console.error("[Mollie] Setup SEPA complete error:", error);
      return { success: false, error: error.message };
    }

    if (!result.success) {
      return { success: false, error: result.error || "Erreur configuration SEPA" };
    }

    const responseData = result.data as {
      customer_id: string;
      mandate_id: string;
      mandate_status: string;
      subscription_id: string | null;
      subscription_status: string | null;
      first_payment_date: string | null;
      subscription_error: string | null;
    };

    return {
      success: true,
      customerId: responseData.customer_id,
      mandateId: responseData.mandate_id,
      mandateStatus: responseData.mandate_status,
      subscriptionId: responseData.subscription_id,
      subscriptionStatus: responseData.subscription_status,
      firstPaymentDate: responseData.first_payment_date,
      subscriptionError: responseData.subscription_error,
    };
  } catch (error) {
    console.error("[Mollie] Setup SEPA complete exception:", error);
    return { success: false, error: "Erreur lors de la configuration SEPA complète" };
  }
}

export interface MollieUpdateSubscriptionData {
  customer_id: string;
  subscription_id: string;
  new_start_date?: string;
  times?: number;
  contract_id?: string;
  company_id?: string;
}

export interface MollieUpdateSubscriptionResponse {
  success: boolean;
  oldSubscriptionId?: string;
  newSubscriptionId?: string;
  newSubscriptionStatus?: string;
  newStartDate?: string;
  nextPaymentDate?: string;
  error?: string;
}

/**
 * Update a Mollie subscription (change billing date)
 * This cancels the current subscription and creates a new one with the updated date
 */
export async function updateMollieSubscription(
  data: MollieUpdateSubscriptionData
): Promise<MollieUpdateSubscriptionResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke("mollie-sepa", {
      body: {
        action: "update_subscription",
        customer_id: data.customer_id,
        subscription_id: data.subscription_id,
        new_start_date: data.new_start_date,
        times: data.times,
        contract_id: data.contract_id,
        company_id: data.company_id,
      },
    });

    if (error) {
      console.error("[Mollie] Update subscription error:", error);
      return { success: false, error: error.message };
    }

    if (!result.success) {
      return { success: false, error: result.error || "Erreur mise à jour abonnement" };
    }

    const responseData = result.data as {
      old_subscription_id: string;
      new_subscription_id: string;
      new_subscription_status: string;
      new_start_date: string;
      next_payment_date: string | null;
    };

    return {
      success: true,
      oldSubscriptionId: responseData.old_subscription_id,
      newSubscriptionId: responseData.new_subscription_id,
      newSubscriptionStatus: responseData.new_subscription_status,
      newStartDate: responseData.new_start_date,
      nextPaymentDate: responseData.next_payment_date || undefined,
    };
  } catch (error) {
    console.error("[Mollie] Update subscription exception:", error);
    return { success: false, error: "Erreur lors de la mise à jour de l'abonnement" };
  }
}

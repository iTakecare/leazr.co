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

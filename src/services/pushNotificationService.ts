import { supabase } from "@/integrations/supabase/client";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

/**
 * Send a push notification to a specific user.
 * Calls the send-push-notification edge function.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: { user_id: userId, ...payload },
  });

  if (error) {
    console.error("[push] sendPushToUser error:", error);
    return { sent: 0, failed: 1 };
  }

  return { sent: data?.sent ?? 0, failed: data?.failed ?? 0 };
}

/**
 * Send a push notification to all subscribed users of a company.
 */
export async function sendPushToCompany(
  companyId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: { company_id: companyId, ...payload },
  });

  if (error) {
    console.error("[push] sendPushToCompany error:", error);
    return { sent: 0, failed: 1 };
  }

  return { sent: data?.sent ?? 0, failed: data?.failed ?? 0 };
}

/**
 * Send a push notification to all subscribed users (admin usage).
 */
export async function sendPushBroadcast(
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: { ...payload },
  });

  if (error) {
    console.error("[push] sendPushBroadcast error:", error);
    return { sent: 0, failed: 1 };
  }

  return { sent: data?.sent ?? 0, failed: data?.failed ?? 0 };
}

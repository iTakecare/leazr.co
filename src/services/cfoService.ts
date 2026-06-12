import { supabase } from "@/integrations/supabase/client";

export interface AiReport {
  id: string;
  kind: "cfo_report" | "cfo_alert" | "cmo_report";
  period: string | null;
  title: string | null;
  content: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const getAiReports = async (companyId: string, kind?: string): Promise<AiReport[]> => {
  let q = supabase
    .from("ai_reports" as any)
    .select("id, kind, period, title, content, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(24);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as AiReport[];
};

export const generateCfoReport = async (companyId: string) => {
  const { data, error } = await supabase.functions.invoke("cfo-ai", {
    body: { companyId, action: "report" },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec de la génération du rapport");
  return data.report as AiReport;
};

export const runCfoAlerts = async (companyId: string) => {
  const { data, error } = await supabase.functions.invoke("cfo-ai", {
    body: { companyId, action: "alerts" },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec des alertes");
  return data as { alerts: number; skipped?: string };
};

export const cfoChat = async (companyId: string, messages: ChatMessage[]) => {
  const { data, error } = await supabase.functions.invoke("cfo-ai", {
    body: { companyId, action: "chat", messages },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec du chat CFO");
  return data.answer as string;
};

// ---------- Yuki ----------
export interface YukiAdministration { id: string; name: string }

export const testYuki = async (companyId: string, accessKey?: string) => {
  const { data, error } = await supabase.functions.invoke("yuki-api", {
    body: { companyId, action: "test", accessKey },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Test Yuki échoué");
  return data.administrations as YukiAdministration[];
};

export const saveYukiIntegration = async (companyId: string, accessKey: string, administrationId: string) => {
  const { error } = await supabase
    .from("company_integrations")
    .upsert(
      {
        company_id: companyId,
        integration_type: "yuki",
        is_enabled: true,
        api_credentials: { accessKey, administrationId },
        settings: {},
      } as any,
      { onConflict: "company_id,integration_type" },
    );
  if (error) throw error;
};

export const getYukiIntegration = async (companyId: string) => {
  const { data } = await supabase
    .from("company_integrations")
    .select("api_credentials, is_enabled")
    .eq("company_id", companyId)
    .eq("integration_type", "yuki")
    .maybeSingle();
  return data as { api_credentials: { accessKey?: string; administrationId?: string }; is_enabled: boolean } | null;
};

export interface YukiBalanceSummary {
  charges_classe6: number;
  produits_classe7: number;
  resultat: number;
  tresorerie_55: number;
  clients_40: number;
  fournisseurs_44: number;
  salaires_62: number;
  amortissements_63: number;
  services_biens_61: number;
  achats_60: number;
}

export const getYukiBalance = async (companyId: string, date?: string) => {
  const { data, error } = await supabase.functions.invoke("yuki-api", {
    body: { companyId, action: "balance", date },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Lecture Yuki échouée");
  return data as { date: string; rows: Array<{ code: string; description: string; amount: number }>; summary: YukiBalanceSummary };
};

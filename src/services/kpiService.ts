import { supabase } from "@/integrations/supabase/client";

export interface KpiExecutedQuery {
  purpose: string;
  sql: string;
}

export interface KpiChatMessage {
  role: "user" | "assistant";
  content: string;
  queries?: KpiExecutedQuery[];
}

export interface KpiReportKpi {
  label: string;
  value: string;
  hint?: string;
}

export interface KpiReportSection {
  heading: string;
  text?: string;
  bullets?: string[];
  table?: { columns: string[]; rows: string[][] };
}

export interface KpiReport {
  title: string;
  subtitle?: string;
  period: string;
  kpis: KpiReportKpi[];
  sections: KpiReportSection[];
  recommendations?: string[];
}

const toPlainMessages = (messages: KpiChatMessage[]) =>
  messages.map(({ role, content }) => ({ role, content }));

export const kpiChat = async (companyId: string, messages: KpiChatMessage[]) => {
  const { data, error } = await supabase.functions.invoke("kpi-ai", {
    body: { companyId, action: "chat", messages: toPlainMessages(messages) },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec de l'analyse");
  return { answer: data.answer as string, queries: (data.queries || []) as KpiExecutedQuery[] };
};

export const kpiReport = async (companyId: string, messages: KpiChatMessage[], focus?: string) => {
  const { data, error } = await supabase.functions.invoke("kpi-ai", {
    body: { companyId, action: "report", messages: toPlainMessages(messages), focus },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec de la génération du rapport");
  return data.report as KpiReport;
};

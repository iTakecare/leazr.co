import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, Send, RefreshCw, FileDown, FileSpreadsheet, Database, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import { KpiChatMessage, KpiReport, kpiChat, kpiReport } from "@/services/kpiService";
import { downloadKpiReportPdf } from "@/services/kpiReportPdfService";
import { downloadKpiReportExcel } from "@/services/kpiReportExcelService";

// Markdown enrichi (tableaux, listes) — même rendu que le CFO IA
const MD: React.FC<{ children: string }> = ({ children }) => (
  <div className="prose prose-sm max-w-none dark:prose-invert
    prose-headings:font-semibold prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h2:border-b prose-h2:pb-1
    prose-table:text-xs prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-td:border-t
    prose-strong:text-foreground prose-li:my-0.5">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);

const SUGGESTIONS = [
  "Quels sont les types de refus, après combien de temps et pour quels motifs ?",
  "Après combien de temps une demande est-elle mise sans suite en moyenne ?",
  "Quel est le taux de conversion demande → contrat par mois cette année ?",
  "Quel délai moyen entre la création d'une demande et son financement ?",
  "Quels clients ont le plus de demandes refusées ?",
];

const KpiAnalystTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [messages, setMessages] = useState<KpiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatting, setChatting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  // Indices des réponses cochées « Inclure au rapport » (PDF/Excel combiné multi-KPI)
  const [selectedForReport, setSelectedForReport] = useState<Set<number>>(new Set());
  // Cache du dernier rapport généré : exporter en PDF puis Excel (ou l'inverse)
  // sur la même sélection ne relance pas l'analyse IA
  const [lastReport, setLastReport] = useState<{ signature: string; report: KpiReport } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatting]);

  const ask = async (question: string) => {
    if (!companyId || !question.trim() || chatting) return;
    const userMsg: KpiChatMessage = { role: "user", content: question.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setChatting(true);
    try {
      const { answer, queries } = await kpiChat(companyId, next);
      setMessages([...next, { role: "assistant", content: answer, queries }]);
    } catch (e: any) {
      toast.error(e.message || "Erreur de l'analyste KPI");
      setMessages(messages); // rollback
      setInput(userMsg.content);
    } finally {
      setChatting(false);
    }
  };

  const toggleForReport = (idx: number) => {
    setSelectedForReport((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Si des analyses sont cochées : rapport combiné sur ces analyses uniquement
  // (chaque réponse cochée est envoyée avec la question qui la précède)
  const buildReportMessages = (): KpiChatMessage[] => {
    if (selectedForReport.size === 0) return messages;
    const subset: KpiChatMessage[] = [];
    messages.forEach((m, i) => {
      if (m.role === "assistant" && selectedForReport.has(i)) {
        const prev = messages[i - 1];
        if (prev?.role === "user") subset.push(prev);
        subset.push(m);
      }
    });
    return subset;
  };

  const handleExport = async (format: "pdf" | "excel") => {
    if (!companyId || generatingPdf) return;
    const reportMessages = buildReportMessages();
    const signature = JSON.stringify(reportMessages.map((m) => m.content));
    setGeneratingPdf(true);
    const toastId = toast.loading(
      lastReport?.signature === signature
        ? "Export du rapport..."
        : selectedForReport.size > 0
          ? `Génération du rapport combiné (${selectedForReport.size} analyse${selectedForReport.size > 1 ? "s" : ""})...`
          : messages.length
            ? "Génération du rapport à partir de la conversation..."
            : "Génération du rapport d'activité général (peut prendre 1-2 min)...",
    );
    try {
      let report = lastReport?.signature === signature ? lastReport.report : null;
      if (!report) {
        report = await kpiReport(companyId, reportMessages);
        setLastReport({ signature, report });
      }
      if (format === "pdf") await downloadKpiReportPdf(report);
      else await downloadKpiReportExcel(report);
      toast.success(format === "pdf" ? "Rapport PDF téléchargé" : "Rapport Excel téléchargé", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la génération du rapport", { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Analyste KPI
            </CardTitle>
            <CardDescription>
              Pose n'importe quelle question chiffrée — l'IA interroge la base en direct (lecture seule) et peut sortir un rapport PDF
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setMessages([]); setSelectedForReport(new Set()); }} disabled={chatting || generatingPdf}>
                <Trash2 className="h-3.5 w-3.5" /> Vider
              </Button>
            )}
            <Button onClick={() => handleExport("pdf")} disabled={generatingPdf || chatting} size="sm" variant="outline" className="gap-2">
              {generatingPdf ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {selectedForReport.size > 0
                ? `PDF combiné (${selectedForReport.size} analyse${selectedForReport.size > 1 ? "s" : ""})`
                : messages.length ? "PDF de cette analyse" : "Rapport d'activité PDF"}
            </Button>
            <Button onClick={() => handleExport("excel")} disabled={generatingPdf || chatting} size="sm" variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <ScrollArea className="h-[520px] pr-3">
          <div className="space-y-3">
            {!messages.length && (
              <div className="text-sm text-muted-foreground space-y-2 py-4">
                <div className="font-medium text-foreground">Exemples de questions :</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      disabled={chatting}
                      className="text-left text-xs border rounded-full px-3 py-1.5 hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs pt-2">
                  L'analyste écrit et exécute lui-même les requêtes SQL (lecture seule, uniquement tes données) : délais, motifs de refus,
                  conversions, marges, achats, factures... Les requêtes utilisées sont consultables sous chaque réponse.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${m.role === "user" ? "bg-primary/10 ml-12" : "bg-muted mr-6"}`}>
                {m.role === "assistant" ? (
                  <>
                    <MD>{m.content}</MD>
                    <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
                      <Checkbox
                        checked={selectedForReport.has(i)}
                        onCheckedChange={() => toggleForReport(i)}
                        className="h-3.5 w-3.5"
                      />
                      Inclure au rapport PDF
                    </label>
                    {m.queries && m.queries.length > 0 && (
                      <details className="mt-2 text-xs text-muted-foreground">
                        <summary className="cursor-pointer flex items-center gap-1">
                          <Database className="h-3 w-3" /> {m.queries.length} requête{m.queries.length > 1 ? "s" : ""} SQL exécutée{m.queries.length > 1 ? "s" : ""}
                        </summary>
                        <div className="mt-2 space-y-2">
                          {m.queries.map((q, qi) => (
                            <div key={qi} className="border rounded p-2 bg-background/60">
                              {q.purpose && <div className="font-medium mb-1">{q.purpose}</div>}
                              <pre className="whitespace-pre-wrap break-all text-[10px] leading-snug">{q.sql}</pre>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                ) : m.content}
              </div>
            ))}
            {chatting && (
              <div className="bg-muted mr-6 rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin" /> L'analyste interroge la base et croise les chiffres...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            placeholder="Ta question sur l'activité (délais, refus, conversions, marges...)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && ask(input)}
            disabled={chatting}
          />
          <Button onClick={() => ask(input)} disabled={chatting || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KpiAnalystTab;

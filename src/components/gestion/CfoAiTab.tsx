import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Send, FileText, AlertTriangle, RefreshCw, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import {
  AiReport, ChatMessage,
  getAiReports, generateCfoReport, cfoChat,
} from "@/services/cfoService";

// Markdown enrichi (tableaux, listes) avec styles lisibles pour les rapports CFO
const MD: React.FC<{ children: string }> = ({ children }) => (
  <div className="prose prose-sm max-w-none dark:prose-invert
    prose-headings:font-semibold prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h2:border-b prose-h2:pb-1
    prose-table:text-xs prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-td:border-t
    prose-strong:text-foreground prose-li:my-0.5">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);

const CfoAiTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [reports, setReports] = useState<AiReport[]>([]);
  const [alerts, setAlerts] = useState<AiReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatting, setChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!companyId) return;
    try {
      const [r, a] = await Promise.all([
        getAiReports(companyId, "cfo_report"),
        getAiReports(companyId, "cfo_alert"),
      ]);
      setReports(r);
      setAlerts(a);
      if (r.length && !selectedReportId) setSelectedReportId(r[0].id);
    } catch (e) {
      console.error("Erreur chargement rapports:", e);
    }
  };

  useEffect(() => { load(); }, [companyId]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleGenerate = async () => {
    if (!companyId) return;
    setGenerating(true);
    try {
      const report = await generateCfoReport(companyId);
      toast.success("Rapport CFO généré");
      setReports((prev) => [report, ...prev]);
      setSelectedReportId(report.id);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!companyId || !input.trim() || chatting) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setChatting(true);
    try {
      const answer = await cfoChat(companyId, next);
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e: any) {
      toast.error(e.message || "Erreur du chat CFO");
      setMessages(messages); // rollback
      setInput(userMsg.content);
    } finally {
      setChatting(false);
    }
  };

  const latestAlert = alerts[0];
  const alertIsRecent = latestAlert &&
    (Date.now() - new Date(latestAlert.created_at).getTime()) < 3 * 86400000;
  const selectedReport = reports.find((r) => r.id === selectedReportId) || null;

  return (
    <div className="space-y-4">
      {/* Alerte récente */}
      {alertIsRecent && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <div className="font-medium mb-1">{latestAlert.title}</div>
            <MD>{latestAlert.content || ""}</MD>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rapports */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Rapports CFO</CardTitle>
                <CardDescription>Généré automatiquement le 1er du mois (ou à la demande)</CardDescription>
              </div>
              <Button onClick={handleGenerate} disabled={generating} size="sm" className="gap-2 shrink-0">
                {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Génération..." : "Générer"}
              </Button>
            </div>
            {reports.length > 1 && (
              <Select value={selectedReportId || ""} onValueChange={setSelectedReportId}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.title || r.period} — {new Date(r.created_at).toLocaleDateString("fr-BE")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {selectedReport ? (
              <ScrollArea className="h-[480px] pr-3">
                <MD>{selectedReport.content || ""}</MD>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />
                Aucun rapport encore. Clique sur « Générer » pour le premier rapport CFO.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Chat CFO</CardTitle>
            <CardDescription>Pose une question — il répond avec tes chiffres réels (ventes, achats, marges, Yuki)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-3">
                {!messages.length && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="font-medium">Exemples :</div>
                    <div>« Quels contrats me font perdre de l'argent ? »</div>
                    <div>« Combien je dépense en marketing vs ce que ça rapporte ? »</div>
                    <div>« Est-ce que je peux me permettre d'embaucher ? »</div>
                    <div>« Quelles factures fournisseurs payer en priorité ? »</div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`rounded-lg p-3 text-sm ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-4"}`}>
                    {m.role === "assistant" ? (
                      <MD>{m.content}</MD>
                    ) : m.content}
                  </div>
                ))}
                {chatting && (
                  <div className="bg-muted mr-4 rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Le CFO analyse tes chiffres...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Ta question au CFO..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={chatting}
              />
              <Button onClick={handleSend} disabled={chatting || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique des alertes */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Historique des alertes
              <Badge variant="secondary">{alerts.length}</Badge>
            </CardTitle>
            <CardDescription>Vérification automatique chaque matin (lun-ven)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <details key={a.id} className="border rounded-lg p-3">
                <summary className="text-sm font-medium cursor-pointer">{a.title} <span className="text-xs text-muted-foreground">— {new Date(a.created_at).toLocaleDateString("fr-BE")}</span></summary>
                <MD>{a.content || ""}</MD>
              </details>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CfoAiTab;

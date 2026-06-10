import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Link as LinkIcon,
  CheckSquare,
  Ticket,
  FileText,
  MessageSquare,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// --- Types locaux légers (client supabase non typé) ---
type SuggestionKind =
  | "link_offer"
  | "task"
  | "create_ticket"
  | "classify_document"
  | "reply";

interface Suggestion {
  kind: SuggestionKind;
  payload: any;
  reason?: string;
}

interface MatchedClient {
  id: string;
  name: string;
}

interface AnalyzeResponse {
  success?: boolean;
  summary?: string;
  matched_client?: MatchedClient | null;
  suggestions?: Suggestion[];
}

interface OfferOption {
  id: string;
  offer_number?: string | null;
  dossier_number?: string | null;
}

interface EmailActionCenterProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  email: {
    id: string;
    from_address?: string;
    from_name?: string;
    subject?: string;
    linked_offer_id?: string | null;
    attachments?: Array<{
      filename: string;
      content_type: string;
      index: number;
    }> | null;
  };
  onReply?: (draft: { subject?: string; body?: string }) => void;
  onChanged?: () => void;
}

const KIND_ICONS: Record<SuggestionKind, React.ReactNode> = {
  link_offer: <LinkIcon className="h-4 w-4 text-primary" />,
  task: <CheckSquare className="h-4 w-4 text-primary" />,
  create_ticket: <Ticket className="h-4 w-4 text-primary" />,
  classify_document: <FileText className="h-4 w-4 text-primary" />,
  reply: <MessageSquare className="h-4 w-4 text-primary" />,
};

const EmailActionCenter = ({
  open,
  onOpenChange,
  email,
  onReply,
  onChanged,
}: EmailActionCenterProps) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [matchedClient, setMatchedClient] = useState<MatchedClient | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [linkedOfferId, setLinkedOfferId] = useState<string | null>(
    email.linked_offer_id ?? null
  );

  // Offres du client (pour classify_document quand aucune demande n'est liée)
  const [clientOffers, setClientOffers] = useState<OfferOption[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectedOfferForDoc, setSelectedOfferForDoc] = useState<string>("");

  // Suggestion en cours d'acceptation (index dans le state)
  const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);

  // --- Récupère companyId au montage ---
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (!cancelled && data) {
        setCompanyId((data as any).company_id ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // --- Analyse de l'email ---
  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setAnalysisError(null);
    try {
      const { data, error } = await supabase.functions.invoke("messaging-ai", {
        body: { action: "analyze_email", email_id: email.id },
      });

      let b: any = data;
      if (error) {
        const ctx = (error as any).context;
        if (ctx?.json) {
          try {
            b = await ctx.json();
          } catch {
            /* ignore */
          }
        }
        if (!b) {
          setAnalysisError(
            (error as any).message || "Erreur lors de l'analyse de l'email."
          );
          return;
        }
      }

      const res = (b ?? {}) as AnalyzeResponse;
      setSummary(res.summary || "");
      setMatchedClient(res.matched_client ?? null);
      setSuggestions(Array.isArray(res.suggestions) ? res.suggestions : []);
    } catch (e: any) {
      setAnalysisError(e?.message || "Erreur lors de l'analyse de l'email.");
    } finally {
      setLoading(false);
    }
  }, [email.id]);

  // Relance l'analyse à chaque ouverture
  useEffect(() => {
    if (open) {
      setLinkedOfferId(email.linked_offer_id ?? null);
      setSelectedOfferForDoc("");
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // --- Charge les offres du client pour classify_document ---
  const loadClientOffers = useCallback(async () => {
    if (!matchedClient?.id) return;
    setOffersLoading(true);
    try {
      const { data } = await supabase
        .from("offers")
        .select("id, offer_number, dossier_number")
        .eq("client_id", matchedClient.id);
      setClientOffers(((data as any[]) || []) as OfferOption[]);
    } catch {
      setClientOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [matchedClient?.id]);

  useEffect(() => {
    // Charge les offres uniquement si nécessaire (au moins une suggestion classify_document
    // sans demande déjà liée)
    const needsOffers =
      suggestions.some((s) => s.kind === "classify_document") &&
      !linkedOfferId &&
      !!matchedClient?.id;
    if (open && needsOffers && clientOffers.length === 0 && !offersLoading) {
      loadClientOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestions, linkedOfferId, matchedClient?.id]);

  const removeSuggestion = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Libellés ---
  const labelFor = (s: Suggestion): string => {
    switch (s.kind) {
      case "link_offer":
        return `Lier à la demande ${s.payload?.offer_label ?? ""}`.trim();
      case "task":
        return `Créer la tâche « ${s.payload?.title ?? ""} »`;
      case "create_ticket":
        return `Créer un ticket : ${s.payload?.title ?? ""}`;
      case "classify_document":
        return `Classer « ${s.payload?.filename ?? ""} » comme ${
          s.payload?.document_type ?? ""
        }`;
      case "reply":
        return "Réponse proposée";
      default:
        return "Action";
    }
  };

  // --- Acceptation d'une suggestion ---
  const acceptSuggestion = async (s: Suggestion, index: number) => {
    setAcceptingIndex(index);
    try {
      switch (s.kind) {
        case "link_offer": {
          const offerId = s.payload?.offer_id;
          if (!offerId) {
            toast.error("Identifiant de demande manquant.");
            return;
          }
          const { error } = await supabase
            .from("synced_emails")
            .update({ linked_offer_id: offerId })
            .eq("id", email.id);
          if (error) {
            toast.error("Erreur lors de la liaison : " + error.message);
            return;
          }
          setLinkedOfferId(offerId);
          toast.success("Email lié à la demande");
          onChanged?.();
          removeSuggestion(index);
          break;
        }

        case "task": {
          if (!companyId || !user?.id) {
            toast.error("Contexte utilisateur indisponible.");
            return;
          }
          const dueInDays =
            typeof s.payload?.due_in_days === "number"
              ? s.payload.due_in_days
              : 3;
          const dueDate = new Date(
            Date.now() + dueInDays * 24 * 60 * 60 * 1000
          ).toISOString();
          const priority = ["low", "medium", "high"].includes(s.payload?.priority)
            ? s.payload.priority
            : "medium";
          const { error } = await supabase.from("tasks").insert({
            company_id: companyId,
            title: s.payload?.title ?? "Tâche depuis email",
            description: s.payload?.description || null,
            due_date: dueDate,
            priority,
            status: "todo",
            related_offer_id: linkedOfferId ?? email.linked_offer_id ?? null,
            created_by: user.id,
          } as any);
          if (error) {
            toast.error("Erreur lors de la création de la tâche : " + error.message);
            return;
          }
          toast.success("Tâche créée");
          onChanged?.();
          removeSuggestion(index);
          break;
        }

        case "create_ticket": {
          if (!companyId || !user?.id) {
            toast.error("Contexte utilisateur indisponible.");
            return;
          }
          try {
            const { data, error } = await supabase
              .from("support_tickets")
              .insert({
                company_id: companyId,
                subject: s.payload?.title ?? email.subject ?? "Ticket depuis email",
                description: `Depuis l'email de ${
                  email.from_name || email.from_address || ""
                }`,
                status: "open",
                created_by: user.id,
              } as any)
              .select("id")
              .single();
            if (error) {
              toast.error("Erreur lors de la création du ticket : " + error.message);
              return;
            }
            const ticketId = (data as any)?.id;
            if (ticketId) {
              const { error: linkErr } = await supabase
                .from("synced_emails")
                .update({ linked_ticket_id: ticketId })
                .eq("id", email.id);
              if (linkErr) {
                // Ne casse pas : le ticket est créé, on prévient juste
                toast.warning("Ticket créé mais liaison à l'email impossible.");
              }
            }
            toast.success("Ticket créé");
            onChanged?.();
            removeSuggestion(index);
          } catch (e: any) {
            toast.error("Erreur ticket : " + (e?.message || "échec"));
          }
          break;
        }

        case "classify_document": {
          const targetOfferId =
            linkedOfferId ?? email.linked_offer_id ?? selectedOfferForDoc;
          if (!targetOfferId) {
            toast.error("Liez d'abord une demande pour classer ce document.");
            return;
          }
          const { error } = await supabase.functions.invoke("mail-sync", {
            body: {
              action: "attach_to_offer",
              email_id: email.id,
              index: s.payload?.attachment_index,
              offer_id: targetOfferId,
              document_type: s.payload?.document_type,
            },
          });
          if (error) {
            toast.error(
              "Erreur lors du classement : " +
                ((error as any).message || "échec")
            );
            return;
          }
          toast.success("Document classé");
          onChanged?.();
          removeSuggestion(index);
          break;
        }

        case "reply": {
          onReply?.({ subject: s.payload?.subject, body: s.payload?.body });
          onOpenChange(false);
          break;
        }
      }
    } finally {
      setAcceptingIndex(null);
    }
  };

  // --- Rendu d'une carte de suggestion ---
  const renderSuggestion = (s: Suggestion, index: number) => {
    const isAccepting = acceptingIndex === index;
    const hasLinkedOffer = !!(linkedOfferId ?? email.linked_offer_id);

    // Pour classify_document : faut-il un sélecteur de demande ?
    const needsOfferSelect = s.kind === "classify_document" && !hasLinkedOffer;
    const canSelectOffer = !!matchedClient?.id;
    const acceptDisabled =
      isAccepting ||
      (needsOfferSelect && (!canSelectOffer || !selectedOfferForDoc));

    return (
      <div
        key={index}
        className="rounded-lg border bg-card p-3 space-y-2"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{KIND_ICONS[s.kind]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{labelFor(s)}</p>
            {s.reason && (
              <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
            )}

            {/* Aperçu de la réponse proposée */}
            {s.kind === "reply" && s.payload?.body && (
              <p className="text-xs italic text-muted-foreground mt-2 line-clamp-3">
                {s.payload.body}
              </p>
            )}

            {/* Sélecteur de demande pour classify_document */}
            {needsOfferSelect && (
              <div className="mt-2">
                {canSelectOffer ? (
                  <Select
                    value={selectedOfferForDoc}
                    onValueChange={setSelectedOfferForDoc}
                    disabled={offersLoading}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue
                        placeholder={
                          offersLoading
                            ? "Chargement des demandes..."
                            : "Choisir une demande"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOffers.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.dossier_number ||
                            o.offer_number ||
                            o.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Liez d'abord une demande
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => acceptSuggestion(s, index)}
              disabled={acceptDisabled}
              title="Accepter"
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeSuggestion(index)}
              disabled={isAccepting}
              title="Ignorer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistant IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* En-tête : résumé + ré-analyser */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse de l'email en cours...
                </div>
              ) : analysisError ? (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {analysisError}
                </p>
              ) : (
                <>
                  {summary && (
                    <p className="text-sm text-muted-foreground">{summary}</p>
                  )}
                  {matchedClient && (
                    <Badge variant="secondary" className="mt-2">
                      Client : {matchedClient.name}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              disabled={loading}
              className="shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
              />
              Ré-analyser
            </Button>
          </div>

          <Separator />

          {/* Liste des suggestions */}
          {!loading && !analysisError && (
            <ScrollArea className="max-h-[55vh]">
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune action suggérée pour cet email.
                </p>
              ) : (
                <div className="space-y-2 pr-3">
                  {suggestions.map((s, i) => renderSuggestion(s, i))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailActionCenter;

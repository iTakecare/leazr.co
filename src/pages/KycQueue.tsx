import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  BceCandidate,
  applyBceCandidate,
  listKycQueue,
  QueueClient,
  searchBceCandidates,
} from "@/services/clients/clientKycCandidates";
import { KYC_SCORE_COLORS, KYC_SCORE_LABELS, KycScoreLetter } from "@/services/clients/clientKycScore";

const KycQueue: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"no_vat" | "all">("no_vat");
  const [clients, setClients] = useState<QueueClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [completedScores, setCompletedScores] = useState<Map<string, KycScoreLetter>>(new Map());

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await listKycQueue(filter);
      setClients(list);
    } catch (err: any) {
      toast.error(`Chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [filter]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = [c.name, c.first_name, c.last_name, c.company, c.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, searchTerm]);

  const visible = filtered.filter((c) => !skippedIds.has(c.id));
  const stats = {
    total: clients.length,
    completed: completedIds.size,
    skipped: skippedIds.size,
    remaining: visible.length - completedIds.size,
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold">File KYC à traiter</h1>
                <p className="text-sm text-muted-foreground">
                  Recherche les clients dans la BCE puis valide manuellement le bon match.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-700">
                ✓ {stats.completed} traités
              </Badge>
              <Badge variant="outline" className="bg-slate-100 border-slate-300">
                ⏭ {stats.skipped} skippés
              </Badge>
              <Badge variant="outline">{stats.remaining} restants</Badge>
            </div>
          </div>

          {/* Filter bar */}
          <Card>
            <CardContent className="pt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="filter-no-vat"
                  checked={filter === "no_vat"}
                  onCheckedChange={(v) => setFilter(v ? "no_vat" : "all")}
                />
                <Label htmlFor="filter-no-vat" className="text-sm cursor-pointer">
                  Seulement les clients sans VAT
                </Label>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrer par nom, société, email…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun client à traiter.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visible.map((client) => (
                <ClientQueueRow
                  key={client.id}
                  client={client}
                  expanded={expandedClientId === client.id}
                  onToggle={() =>
                    setExpandedClientId((prev) => (prev === client.id ? null : client.id))
                  }
                  completedScore={completedScores.get(client.id)}
                  onSkip={() => {
                    setSkippedIds((s) => new Set(s).add(client.id));
                    setExpandedClientId(null);
                  }}
                  onCompleted={(score) => {
                    setCompletedIds((s) => new Set(s).add(client.id));
                    if (score) {
                      setCompletedScores((m) => {
                        const next = new Map(m);
                        next.set(client.id, score as KycScoreLetter);
                        return next;
                      });
                    }
                    setExpandedClientId(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </PageTransition>
  );
};

interface ClientQueueRowProps {
  client: QueueClient;
  expanded: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onCompleted: (score: string | null) => void;
  completedScore?: KycScoreLetter;
}

const ClientQueueRow: React.FC<ClientQueueRowProps> = ({
  client,
  expanded,
  onToggle,
  onSkip,
  onCompleted,
  completedScore,
}) => {
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<BceCandidate[] | null>(null);
  const [queries, setQueries] = useState<string[]>([]);
  const [customWord, setCustomWord] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [applyingNumber, setApplyingNumber] = useState<string | null>(null);

  useEffect(() => {
    if (expanded && candidates === null && !searching) {
      runSearch();
    }
  }, [expanded]);

  const runSearch = async (override?: string) => {
    setSearching(true);
    setSearchError(null);
    try {
      const resp = await searchBceCandidates(client.id, override);
      if (!resp.success) {
        setSearchError(resp.message || "Recherche échouée");
        setCandidates([]);
        return;
      }
      setCandidates(resp.candidates || []);
      setQueries(resp.queries || []);
    } catch (err: any) {
      setSearchError(err.message);
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePick = async (cand: BceCandidate) => {
    setApplyingNumber(cand.enterprise_number);
    const tid = toast.loading(`Application du candidat ${cand.name}…`);
    try {
      const result = await applyBceCandidate(client.id, cand);
      toast.success(
        `${cand.name} appliqué — Score ${result.score ?? "?"} (${
          Object.keys(result.appliedFields).length
        } champs remplis)`,
        { id: tid, duration: 5000 },
      );
      onCompleted(result.score);
    } catch (err: any) {
      toast.error(err.message || "Échec de l'application", { id: tid });
    } finally {
      setApplyingNumber(null);
    }
  };

  const colors = completedScore ? KYC_SCORE_COLORS[completedScore] : null;

  return (
    <Card className={completedScore ? `border-l-4 ${colors?.border}` : ""}>
      <CardHeader
        className="py-3 cursor-pointer hover:bg-muted/30"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">
                {client.first_name && client.last_name
                  ? `${client.first_name} ${client.last_name}`
                  : client.name}
              </CardTitle>
              {client.company && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {client.company}
                </Badge>
              )}
              {!client.has_vat && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">
                  Sans VAT
                </Badge>
              )}
              {completedScore && colors && (
                <Badge className={`${colors.bg} ${colors.text} border ${colors.border}`}>
                  Score {completedScore} · {KYC_SCORE_LABELS[completedScore]}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 flex items-center gap-3 text-xs">
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {client.email}
                </span>
              )}
              <span>Créé le {new Date(client.created_at).toLocaleDateString("fr-BE")}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!completedScore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Skip
              </Button>
            )}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-3 border-t">
          {/* Recherche custom */}
          <div className="flex items-end gap-2 pt-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">
                Recherche dans la BCE (par défaut : société + nom complet)
              </Label>
              <Input
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
                placeholder={queries.join(" · ") || "Tape un nom ou une société…"}
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runSearch(customWord.trim() || undefined)}
              disabled={searching}
            >
              {searching && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              <Search className="h-3 w-3 mr-1" />
              Rechercher
            </Button>
          </div>

          {searching && (
            <div className="text-xs text-muted-foreground italic flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Interrogation BCE pour {queries.join(" + ") || "ce client"}…
            </div>
          )}

          {searchError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {searchError}
            </div>
          )}

          {candidates && candidates.length === 0 && !searching && !searchError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Aucun candidat trouvé dans la BCE pour {queries.join(" / ")}. Essaie une autre orthographe ou skip.
            </div>
          )}

          {candidates && candidates.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {candidates.length} candidat(s) trouvé(s) — choisis le bon match :
              </div>
              {candidates.map((cand) => (
                <CandidateCard
                  key={cand.enterprise_number}
                  candidate={cand}
                  applying={applyingNumber === cand.enterprise_number}
                  disabledByOther={applyingNumber !== null && applyingNumber !== cand.enterprise_number}
                  onPick={() => handlePick(cand)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const CandidateCard: React.FC<{
  candidate: BceCandidate;
  applying: boolean;
  disabledByOther: boolean;
  onPick: () => void;
}> = ({ candidate, applying, disabledByOther, onPick }) => {
  const typeLabel =
    candidate.type === "ENT_PM"
      ? "Société"
      : candidate.type === "ENT_NP"
        ? "Indépendant"
        : "—";
  return (
    <div className="border rounded-md p-3 flex items-start justify-between gap-3 hover:border-primary/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{candidate.name}</span>
          <Badge variant="outline" className="text-[10px] py-0 h-4">
            {typeLabel}
          </Badge>
          {candidate.status && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 border-emerald-200 text-emerald-700">
              {candidate.status}
            </Badge>
          )}
          <a
            href={`https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${candidate.enterprise_number}&lang=fr`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
          >
            BCE <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
          <span>N°: {candidate.vat_format}</span>
          {candidate.start_date_raw && <span>Créée: {candidate.start_date_raw}</span>}
          {candidate.address && <span>📍 {candidate.address}</span>}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 italic">
          Match via "{candidate.source_query}"
        </div>
      </div>
      <Button size="sm" onClick={onPick} disabled={applying || disabledByOther}>
        {applying && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
        <CheckCircle2 className="h-3 w-3 mr-1" />
        C'est lui
      </Button>
    </div>
  );
};

export default KycQueue;

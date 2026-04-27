import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  BceCandidate,
  applyBceCandidate,
  searchBceCandidates,
} from "@/services/clients/clientKycCandidates";

interface BceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Optional initial query to use instead of the default (company + name). */
  initialSearchWord?: string;
  /** Called after successful apply (to refresh the parent state). */
  onApplied?: (score: string | null) => void;
}

const BceSearchDialog: React.FC<BceSearchDialogProps> = ({
  open,
  onOpenChange,
  clientId,
  initialSearchWord,
  onApplied,
}) => {
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<BceCandidate[] | null>(null);
  const [queries, setQueries] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [customWord, setCustomWord] = useState("");
  const [applyingNumber, setApplyingNumber] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Reset
      setCandidates(null);
      setQueries([]);
      setSearchError(null);
      setCustomWord(initialSearchWord ?? "");
      // Auto-launch initial search
      runSearch(initialSearchWord);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId]);

  const runSearch = async (override?: string) => {
    setSearching(true);
    setSearchError(null);
    try {
      const resp = await searchBceCandidates(clientId, override);
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
    const tid = toast.loading(`Application de ${cand.name}…`);
    try {
      const result = await applyBceCandidate(clientId, cand);
      toast.success(
        `${cand.name} appliqué — Score ${result.score ?? "?"} (${
          Object.keys(result.appliedFields).length
        } champs remplis)`,
        { id: tid, duration: 5000 },
      );
      onApplied?.(result.score ?? null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Échec de l'application", { id: tid });
    } finally {
      setApplyingNumber(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Rechercher dans la BCE
          </DialogTitle>
          <DialogDescription>
            Cherche par nom de société et/ou nom complet du contact. Sélectionne le bon
            match : son n° d'entreprise sera posé sur la fiche client puis l'auto-lookup
            remplira la forme juridique, la date de création, le secteur, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Query input */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">
                Recherche (vide = société + nom du contact)
              </Label>
              <Input
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
                placeholder={queries.join(" · ") || "Tape un nom de société, un nom + prénom…"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch(customWord.trim() || undefined);
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => runSearch(customWord.trim() || undefined)}
              disabled={searching}
            >
              {searching && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              <Search className="h-3 w-3 mr-1" />
              Rechercher
            </Button>
          </div>

          {/* Status messages */}
          {searching && (
            <div className="text-sm text-muted-foreground italic flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Interrogation BCE pour {queries.length > 0 ? queries.join(" + ") : "ce client"}…
            </div>
          )}

          {searchError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {searchError}
            </div>
          )}

          {candidates && candidates.length === 0 && !searching && !searchError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Aucun candidat BCE trouvé pour {queries.join(" / ") || customWord}. Essaie une
              autre orthographe ou une partie du nom.
            </div>
          )}

          {candidates && candidates.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {candidates.length} candidat(s) — choisis le bon match :
              </div>
              {candidates.map((cand) => (
                <CandidateRow
                  key={cand.enterprise_number}
                  candidate={cand}
                  applying={applyingNumber === cand.enterprise_number}
                  disabledByOther={
                    applyingNumber !== null && applyingNumber !== cand.enterprise_number
                  }
                  onPick={() => handlePick(cand)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CandidateRow: React.FC<{
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
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-4 bg-emerald-50 border-emerald-200 text-emerald-700"
            >
              {candidate.status}
            </Badge>
          )}
          <a
            href={`https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${candidate.enterprise_number}&lang=fr`}
            target="_blank"
            rel="noreferrer"
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

export default BceSearchDialog;

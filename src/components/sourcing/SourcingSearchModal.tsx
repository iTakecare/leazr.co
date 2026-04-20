/**
 * Modale "Sourcer avec extension" — la pièce centrale de l'outil.
 *
 * - Reçoit une query (manuelle ou depuis une ligne de commande)
 * - Lance la recherche multi-source via l'extension Chrome
 * - Affiche les résultats au fur et à mesure (streaming)
 * - Classe les offres par coût total (price + delivery)
 * - Clic sur une offre → POST à `sourcing-ingest-offer` (lie à la commande)
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Truck,
  Clock,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  searchViaExtension,
  detectExtension,
  type OfferFromExtension,
  type SearchProgressEvent,
} from "@/services/sourcing/extensionBridge";

export interface SourcingSearchTarget {
  type: "equipment_order_unit" | "contract_equipment" | "offer_equipment";
  id: string;
  label?: string;
}

export interface SourcingSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  target?: SourcingSearchTarget;
  onOfferSelected?: (offerId: string) => void;
}

interface SourceState {
  key: string;
  status: "idle" | "running" | "success" | "failed";
  offers: OfferFromExtension[]; // pertinentes (filtrées)
  all_offers: OfferFromExtension[]; // toutes trouvées (avant filtre pertinence)
  error?: string;
}

const SourcingSearchModal: React.FC<SourcingSearchModalProps> = ({
  open,
  onOpenChange,
  query,
  target,
  onOfferSelected,
}) => {
  const [extensionAvailable, setExtensionAvailable] = useState<boolean | null>(null);
  const [searching, setSearching] = useState(false);
  const [sources, setSources] = useState<Record<string, SourceState>>({});
  const [allOffers, setAllOffers] = useState<OfferFromExtension[]>([]); // pertinentes uniquement
  const [allOffersUnfiltered, setAllOffersUnfiltered] = useState<OfferFromExtension[]>([]); // tout
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set()); // empty = tout montrer
  const hasStarted = useRef(false);

  // Détecter l'extension à l'ouverture
  useEffect(() => {
    if (!open) return;
    detectExtension().then((info) => setExtensionAvailable(info.installed));
  }, [open]);

  // Lancer automatiquement la recherche quand la modale s'ouvre
  useEffect(() => {
    if (!open || !query.trim() || extensionAvailable !== true) return;
    if (hasStarted.current) return;
    hasStarted.current = true;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, extensionAvailable]);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      hasStarted.current = false;
      setSources({});
      setAllOffers([]);
      setAllOffersUnfiltered([]);
      setCompletedAt(null);
      setError(null);
      setShowAll(false);
      setSourceFilter(new Set());
    }
  }, [open]);

  const handleProgress = (evt: SearchProgressEvent) => {
    switch (evt.type) {
      case "search_started":
        setSources(() =>
          Object.fromEntries(
            evt.sources.map((s) => [s, { key: s, status: "idle", offers: [], all_offers: [] }])
          )
        );
        break;
      case "source_started":
        setSources((prev) => ({
          ...prev,
          [evt.source]: {
            ...(prev[evt.source] ?? { key: evt.source, offers: [], all_offers: [] }),
            status: "running",
          },
        }));
        break;
      case "source_result": {
        const allFromSource = evt.all_offers ?? evt.offers;
        setSources((prev) => ({
          ...prev,
          [evt.source]: {
            key: evt.source,
            status: evt.offers.length > 0 ? "success" : "failed",
            offers: evt.offers,
            all_offers: allFromSource,
            error: evt.offers.length === 0 ? "Aucun résultat pertinent" : undefined,
          },
        }));
        setAllOffers((prev) => [...prev, ...evt.offers.map((o) => ({ ...o, source: evt.source }))]);
        setAllOffersUnfiltered((prev) => [
          ...prev,
          ...allFromSource.map((o) => ({ ...o, source: evt.source })),
        ]);
        break;
      }
      case "source_failed":
        setSources((prev) => ({
          ...prev,
          [evt.source]: {
            ...(prev[evt.source] ?? { key: evt.source, offers: [], all_offers: [] }),
            status: "failed",
            error: evt.error,
          },
        }));
        break;
      case "search_completed":
        setCompletedAt(Date.now());
        break;
    }
  };

  const runSearch = async () => {
    setSearching(true);
    setError(null);
    try {
      const result = await searchViaExtension(query, {
        limit_per_source: 3,
        timeout_ms: 20000,
        onProgress: handleProgress,
      });
      // En cas de progress manqué, hydrate quand même avec les offres finales
      if (result.offers.length > 0 && allOffers.length === 0) {
        setAllOffers(result.offers);
      }
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectOffer = async (offer: OfferFromExtension) => {
    if (!target) {
      toast.error("Aucune commande cible — impossible de rattacher cette offre");
      return;
    }
    const offerKey = `${offer.source}::${offer.url}`;
    setSubmittingId(offerKey);
    try {
      const { data, error } = await supabase.functions.invoke("sourcing-ingest-offer", {
        body: {
          target:
            target.type === "equipment_order_unit"
              ? { equipment_order_unit_id: target.id }
              : target.type === "contract_equipment"
              ? { contract_equipment_id: target.id }
              : { offer_equipment_id: target.id },
          supplier_hint: { host: offer.captured_host },
          offer: {
            title: offer.title,
            price_cents: offer.price_cents,
            delivery_cost_cents: offer.delivery_cost_cents ?? 0,
            delivery_days_min: offer.delivery_days_min,
            delivery_days_max: offer.delivery_days_max,
            condition: offer.condition,
            warranty_months: offer.warranty_months,
            url: offer.url,
            image_url: offer.image_url,
            stock_status: offer.stock_status ?? "unknown",
            currency: offer.currency ?? "EUR",
            raw_specs: { ...offer.raw_specs, source: offer.source },
          },
          source_channel: "search",
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Erreur ingestion");

      toast.success(
        data.needs_validation
          ? "Offre proposée, en attente de validation admin"
          : "Offre sélectionnée et liée à la commande"
      );
      onOfferSelected?.(data.id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSubmittingId(null);
    }
  };

  // Base de travail : filtré par pertinence OU étendu (tout)
  const baseOffers = showAll ? allOffersUnfiltered : allOffers;

  // Appliquer le filtre par source si l'user a coché/décoché des sources
  const filteredOffers = sourceFilter.size === 0
    ? baseOffers
    : baseOffers.filter((o) => sourceFilter.has(o.source));

  // Tri par coût total croissant
  const sortedOffers = [...filteredOffers].sort((a, b) => {
    const totalA = a.price_cents + (a.delivery_cost_cents ?? 0);
    const totalB = b.price_cents + (b.delivery_cost_cents ?? 0);
    return totalA - totalB;
  });

  // Stats pour UI
  const strictCount = allOffers.length;
  const wideCount = allOffersUnfiltered.length;
  const hiddenByStrict = wideCount - strictCount;

  const sourcesArr = Object.values(sources);
  const completedSources = sourcesArr.filter((s) => s.status === "success" || s.status === "failed").length;
  const totalSources = sourcesArr.length;
  const progress = totalSources > 0 ? (completedSources / totalSources) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Recherche multi-fournisseurs
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Requête : <span className="font-mono">{query}</span>
            {target?.label && <> · Cible : <strong>{target.label}</strong></>}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 px-6 py-4 bg-slate-50">
          {/* État extension */}
          {extensionAvailable === false && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Extension Chrome non installée. Installe-la pour utiliser la recherche multi-source.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Barre de progression par source */}
          {sourcesArr.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Interrogation des sources : {completedSources}/{totalSources}</span>
                {completedAt && <span>Terminé en {((completedAt - (completedAt - 1000)) / 1000).toFixed(1)}s</span>}
              </div>
              <Progress value={progress} className="h-1.5" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sourcesArr.map((s) => {
                  const isIncluded = sourceFilter.size === 0 || sourceFilter.has(s.key);
                  const clickable = s.all_offers.length > 0 || s.offers.length > 0;
                  return (
                    <button
                      key={s.key}
                      disabled={!clickable}
                      onClick={() => {
                        if (!clickable) return;
                        setSourceFilter((prev) => {
                          const next = new Set(prev);
                          // Si aucun filtre, cliquer = garder uniquement cette source
                          if (prev.size === 0) {
                            // Toggle: on ajoute toutes les autres et on retire celle cliquée
                            sourcesArr.forEach((src) => {
                              if (src.key !== s.key) next.add(src.key);
                            });
                          } else if (prev.has(s.key)) {
                            next.delete(s.key);
                          } else {
                            next.add(s.key);
                          }
                          // Si toutes cochées → reset (équivalent "tout")
                          if (next.size === sourcesArr.length) next.clear();
                          return next;
                        });
                      }}
                      className={`text-[10px] gap-1 inline-flex items-center px-2 py-0.5 rounded-full border transition-opacity ${
                        !isIncluded ? "opacity-40" : ""
                      } ${
                        s.status === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : s.status === "failed"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : s.status === "running"
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "bg-white border-slate-200"
                      } ${clickable ? "cursor-pointer hover:shadow-sm" : "cursor-not-allowed"}`}
                      title={clickable ? "Cliquer pour filtrer" : "Aucun résultat à filtrer"}
                    >
                      {s.status === "success" && <CheckCircle2 className="h-2.5 w-2.5" />}
                      {s.status === "failed" && <X className="h-2.5 w-2.5" />}
                      {s.status === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                      {s.key}
                      {s.status === "success" && ` · ${showAll ? s.all_offers.length : s.offers.length}`}
                      {s.status === "failed" && s.all_offers.length > 0 && ` · ${s.all_offers.length} (auto-rejetées)`}
                      {s.status === "failed" && s.all_offers.length === 0 && s.error && ` · ${s.error.slice(0, 20)}`}
                    </button>
                  );
                })}
              </div>
              {/* Toggle élargir la recherche */}
              {completedAt && hiddenByStrict > 0 && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="text-xs text-muted-foreground">
                    {showAll ? (
                      <>
                        <strong className="text-slate-800">{sortedOffers.length}</strong> offres au
                        total ({hiddenByStrict} hors spec stricte)
                      </>
                    ) : (
                      <>
                        <strong className="text-slate-800">{strictCount}</strong> pertinentes —{" "}
                        <span className="text-amber-700">{hiddenByStrict} masquées par filtre strict</span>
                      </>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? "⇠ Mode strict" : "Élargir la recherche →"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Résultats */}
          {sortedOffers.length === 0 && !searching && sourcesArr.length > 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Aucun résultat trouvé.</p>
              <p className="text-xs mt-1">Essaie avec d'autres mots-clés ou vérifie l'orthographe.</p>
            </div>
          )}

          {searching && sourcesArr.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
              <p className="text-sm">Connexion à l'extension…</p>
            </div>
          )}

          {sortedOffers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedOffers.slice(0, 12).map((offer, idx) => {
                const offerKey = `${offer.source}::${offer.url}`;
                const isSubmitting = submittingId === offerKey;
                const totalCostCents = offer.price_cents + (offer.delivery_cost_cents ?? 0);
                return (
                  <div
                    key={offerKey}
                    className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {offer.image_url && (
                        <img
                          src={offer.image_url}
                          alt=""
                          className="w-14 h-14 object-contain rounded border border-slate-100 shrink-0 bg-white"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground truncate">
                          #{idx + 1} · {offer.source}
                        </div>
                        <div className="text-sm font-medium leading-tight line-clamp-2">{offer.title}</div>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-lg font-bold text-indigo-700">
                        {(offer.price_cents / 100).toFixed(2).replace(".", ",")} €
                      </span>
                      <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-200 rounded px-1 py-px">
                        HT
                      </span>
                      {offer.delivery_cost_cents && offer.delivery_cost_cents > 0 && (
                        <span className="text-xs text-muted-foreground">
                          + {(offer.delivery_cost_cents / 100).toFixed(2).replace(".", ",")} € livr.
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Total HT :{" "}
                      <strong className="text-slate-800">
                        {(totalCostCents / 100).toFixed(2).replace(".", ",")} €
                      </strong>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px] mb-2">
                      {offer.condition && offer.condition !== "unknown" && (
                        <Badge variant="outline" className="gap-1">
                          {offer.condition === "new" ? "Neuf" : `Recond. ${offer.condition.replace("grade_", "")}`}
                        </Badge>
                      )}
                      {offer.delivery_days_max && (
                        <Badge variant="outline" className="gap-1">
                          <Truck className="h-2.5 w-2.5" />
                          {offer.delivery_days_min === offer.delivery_days_max
                            ? `${offer.delivery_days_min}j`
                            : `${offer.delivery_days_min ?? "?"}-${offer.delivery_days_max}j`}
                        </Badge>
                      )}
                      {offer.stock_status === "in_stock" && (
                        <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-700 bg-emerald-50">
                          En stock
                        </Badge>
                      )}
                      {offer.stock_status === "limited" && (
                        <Badge variant="outline" className="gap-1 border-amber-200 text-amber-700 bg-amber-50">
                          <Clock className="h-2.5 w-2.5" />
                          Limité
                        </Badge>
                      )}
                    </div>

                    <div className="mt-auto flex gap-1.5 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs flex-1"
                        onClick={() => window.open(offer.url, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Voir
                      </Button>
                      {target && (
                        <Button
                          size="sm"
                          className="h-8 text-xs flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => handleSelectOffer(offer)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Sélectionner"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-white flex-row justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground self-center">
            {sortedOffers.length > 0 &&
              `${sortedOffers.length} offres (prix HT) classées par coût total croissant`}
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SourcingSearchModal;

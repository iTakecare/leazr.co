/**
 * SourcingOptimizerPage
 *
 * Page principale de l'Optimiseur de Sourcing.
 * MVP : champ de recherche + liste des offres proposées/validées pour la société.
 *
 * À venir (prochaines sessions) :
 *  - Recherche temps réel multi-sources via edge function sourcing-search
 *  - Résultats streamés avec top 5 classé par score
 *  - Bouton "Ajouter manuellement via URL"
 *  - Onglet "File de validation" pour les admins
 */
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Sparkles, Loader2, Package, CheckCircle2, Clock, XCircle, ExternalLink, Link2, Chrome } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import SourcingSearchModal from "@/components/sourcing/SourcingSearchModal";
import ExtensionInstallDialog from "@/components/sourcing/ExtensionInstallDialog";
import { detectExtension } from "@/services/sourcing/extensionBridge";

interface PendingItem {
  id: string;
  status: string;
  total_cost_cents: number;
  offer_snapshot: {
    title?: string;
    url?: string;
    price_cents?: number;
    delivery_cost_cents?: number;
    condition?: string;
    stock_status?: string;
    image_url?: string;
  };
  supplier_id: string | null;
  source_channel: string | null;
  proposed_at: string | null;
  proposer_role: string | null;
}

const SourcingOptimizerPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  useEffect(() => {
    detectExtension().then((info) => setExtensionInstalled(info.installed));
  }, []);

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from("order_line_sourcing")
        .select(
          "id, status, total_cost_cents, offer_snapshot, supplier_id, source_channel, proposed_at, proposer_role"
        )
        .in("status", ["proposed", "approved"])
        .order("proposed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setPendingItems((data ?? []) as PendingItem[]);
    } catch (e: any) {
      toast.error(`Erreur chargement: ${e.message}`);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error("Entrez un terme de recherche");
      return;
    }
    if (extensionInstalled === false) {
      toast.error("Extension Chrome non installée — nécessaire pour la recherche multi-source");
      return;
    }
    setModalQuery(query.trim());
    setModalOpen(true);
  };

  return (
    <PageTransition>
      <Container>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              Optimiseur de Sourcing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recherchez en temps réel les meilleures offres de matériel reconditionné chez vos fournisseurs
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {extensionInstalled === true ? (
              <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Extension connectée
              </Badge>
            ) : extensionInstalled === false ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setInstallDialogOpen(true)}
              >
                <Chrome className="h-4 w-4" />
                Installer l'extension
              </Button>
            ) : (
              <Badge variant="outline" className="gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Détection…
              </Badge>
            )}
          </div>
        </div>

        {/* Search bar */}
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-11"
                  placeholder="ex: MacBook Air M2 16Go 512Go gris sidéral, iPhone 14 Pro 128Go…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  disabled={searching}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Rechercher
              </Button>
              <Button variant="outline" className="h-11 gap-2">
                <Link2 className="h-4 w-4" />
                Coller URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              La recherche interroge en parallèle tes fournisseurs connectés (sans indexation, 100% temps réel).
            </p>
          </CardContent>
        </Card>

        {extensionInstalled === false && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertDescription className="text-sm">
              <strong>Extension Chrome non détectée.</strong> Pour utiliser la recherche multi-fournisseurs en temps réel,
              installe l'extension Leazr Sourcing Helper. Tu peux quand même collecter manuellement des offres via
              un clic-droit ou le bouton "Coller URL".
            </AlertDescription>
          </Alert>
        )}

        {/* Offres collectées (via extension principalement pour l'instant) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              Offres collectées
              <Badge variant="outline" className="ml-1">{pendingItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="py-12 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Aucune offre collectée pour l'instant.</p>
                <p className="text-xs mt-1">
                  Installe l'extension Chrome et navigue sur les sites de tes fournisseurs pour commencer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingItems.map((item) => {
                  const snap = item.offer_snapshot ?? {};
                  const statusCfg =
                    item.status === "proposed"
                      ? { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200 text-amber-700", label: "À valider" }
                      : item.status === "approved"
                      ? { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Validé" }
                      : { icon: XCircle, color: "text-slate-400", bg: "bg-slate-50 border-slate-200 text-slate-600", label: item.status };
                  const StIcon = statusCfg.icon;

                  return (
                    <div key={item.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium text-sm line-clamp-2 flex-1">
                          {snap.title ?? "Sans titre"}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${statusCfg.bg} shrink-0 gap-1`}>
                          <StIcon className="h-2.5 w-2.5" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-indigo-700 mb-2">
                        {(item.total_cost_cents / 100).toFixed(2).replace(".", ",")} €
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {item.source_channel === "extension" ? "🦎 Extension" :
                           item.source_channel === "manual_url" ? "🔗 URL" :
                           item.source_channel === "search" ? "🔍 Recherche" : item.source_channel}
                        </span>
                        {snap.url && (
                          <a
                            href={snap.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            Voir
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modale recherche multi-source */}
        <SourcingSearchModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          query={modalQuery}
          onOfferSelected={() => {
            loadPending(); // refresh la liste des offres collectées
          }}
        />

        {/* Modale d'installation de l'extension Chrome */}
        <ExtensionInstallDialog
          open={installDialogOpen}
          onOpenChange={setInstallDialogOpen}
        />
      </Container>
    </PageTransition>
  );
};

export default SourcingOptimizerPage;

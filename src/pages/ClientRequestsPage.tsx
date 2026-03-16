import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, XCircle, CheckCircle2, CircleDot, Circle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { motion } from "framer-motion";

const WORKFLOW_STEPS = [
  { key: "draft", label: "Soumise" },
  { key: "internal_review", label: "En analyse" },
  { key: "internal_approved", label: "Approuvée" },
  { key: "leaser_scoring", label: "Scoring" },
  { key: "offer_send", label: "Offre envoyée" },
  { key: "accepted", label: "Acceptée" },
  { key: "contract_sent", label: "Contrat envoyé" },
  { key: "contract_signed", label: "Signé" },
];

const WORKFLOW_STATUS_MAP: Record<string, string> = {
  draft: "draft",
  submitted: "draft",
  internal_review: "internal_review",
  internal_docs_requested: "internal_review",
  internal_approved: "internal_approved",
  leaser_introduced: "leaser_scoring",
  leaser_scoring: "leaser_scoring",
  offer_send: "offer_send",
  offer_validation: "offer_send",
  accepted: "accepted",
  contract_sent: "contract_sent",
  contrat_pret: "contract_sent",
  contract_signed: "contract_signed",
};

function getStepIndex(workflowStatus?: string, offerStatus?: string): number {
  const status = workflowStatus || offerStatus || "draft";
  const mappedKey = WORKFLOW_STATUS_MAP[status] || "draft";
  const idx = WORKFLOW_STEPS.findIndex((s) => s.key === mappedKey);
  return idx >= 0 ? idx : 0;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ClientRequestsPage = () => {
  const { user } = useAuth();
  const { navigateToClient } = useRoleNavigation();
  const { offers, loading, error } = useClientOffers(user?.email);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatEquipmentDescription = (description?: string) => {
    if (!description) return 'Équipement non spécifié';
    try {
      const equipmentData = JSON.parse(description);
      if (Array.isArray(equipmentData) && equipmentData.length > 0) {
        const titles = equipmentData
          .map(item => item.title || item.product_name || item.name)
          .filter(Boolean)
          .filter(t => t !== 'Produit inconnu');
        if (titles.length > 0) {
          return titles.length > 1
            ? `${titles[0]} et ${titles.length - 1} autre(s)`
            : titles[0];
        }
      }
    } catch {
      // Not JSON, check for "Produit inconnu" in plain text
      if (description.includes('Produit inconnu')) {
        // Extract product names from the description lines (format: "Name - Prix: ...")
        const lines = description.split('\n').filter(Boolean);
        const names = lines.map(line => line.split(' - ')[0]?.trim()).filter(Boolean);
        if (names.length > 0) {
          return names.length > 1
            ? `${names[0]} et ${names.length - 1} autre(s)`
            : names[0];
        }
      }
      return description;
    }
    return description;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-0 rounded-full">En attente</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-full">Approuvée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-0 rounded-full">Rejetée</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 border-0 rounded-full">Envoyée</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-orange-500" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-2xl w-1/3" />
          <div className="h-4 bg-muted rounded-2xl w-1/2" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5 rounded-2xl">
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">Erreur lors du chargement des demandes : {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Mes Demandes</h1>
        <p className="text-muted-foreground">
          Suivez l'état de vos demandes de financement et de leasing
        </p>
      </motion.div>

      <div className="grid gap-4">
        {offers.map((offer) => {
          const currentIdx = getStepIndex(offer.workflow_status, offer.status);
          return (
            <motion.div key={offer.id} variants={itemVariants}>
              <Card
                className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigateToClient(`requests/${offer.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/40">
                        {getStatusIcon(offer.status)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {formatEquipmentDescription(offer.equipment_description)}
                        </CardTitle>
                        <CardDescription>
                          Soumise le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(offer.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Mensualité</p>
                      <p className="text-lg font-semibold">{formatAmount(offer.monthly_payment)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">
                        {offer.type === 'client_request' ? 'Demande client' : 'Offre'}
                      </p>
                    </div>
                  </div>

                  {/* Detailed workflow stepper */}
                  {offer.status !== 'rejected' && (
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Progression</p>
                      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
                        {WORKFLOW_STEPS.map((step, i) => {
                          const isDone = i < currentIdx;
                          const isActive = i === currentIdx;
                          const isUpcoming = i > currentIdx;
                          return (
                            <React.Fragment key={step.key}>
                              <div className="flex flex-col items-center gap-1.5 min-w-[55px] flex-shrink-0">
                                {isDone ? (
                                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                  </div>
                                ) : isActive ? (
                                  <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                                    <CircleDot className="h-3.5 w-3.5 text-white" />
                                  </div>
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                                    <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />
                                  </div>
                                )}
                                <span className={`text-[8px] leading-tight text-center ${isUpcoming ? "text-muted-foreground/40" : isDone ? "text-emerald-600 font-medium" : "text-blue-600 font-semibold"}`}>
                                  {step.label}
                                </span>
                              </div>
                              {i < WORKFLOW_STEPS.length - 1 && (
                                <div className={`h-0.5 flex-1 min-w-[8px] rounded-full -mt-4 ${isDone ? "bg-emerald-400" : "bg-muted-foreground/15"}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {offers.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
              <h3 className="text-lg font-semibold mb-2">Aucune demande</h3>
              <p className="text-muted-foreground text-center text-sm">
                Vous n'avez pas encore soumis de demandes de financement.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ClientRequestsPage;

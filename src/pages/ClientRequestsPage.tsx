import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { motion } from "framer-motion";
import MiniWorkflowStepper from "@/components/client/MiniWorkflowStepper";

const getOfferTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'client_request': 'Demande client',
    'web_request': 'Demande en ligne',
    'partner_request': 'Offre partenaire',
    'ambassador_offer': 'Offre ambassadeur',
    'custom_pack_request': 'Pack personnalisé',
    'purchase_request': "Demande d'achat",
    'self_leasing': 'Auto-financement',
  };
  return labels[type] || type;
};


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
                        {getOfferTypeLabel(offer.type)}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic workflow stepper */}
                  {offer.status !== 'rejected' && (
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Progression</p>
                      <MiniWorkflowStepper
                        currentStatus={offer.workflow_status || offer.status || 'draft'}
                        offerType={offer.type}
                        workflowTemplateId={offer.workflow_template_id}
                        companyId={offer.company_id}
                      />
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

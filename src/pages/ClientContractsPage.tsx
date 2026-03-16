import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useClientContracts } from "@/hooks/useClientContracts";
import { useClientData } from "@/hooks/useClientData";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { motion } from "framer-motion";
import { differenceInMonths, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import RenewalRequestModal from "@/components/client/RenewalRequestModal";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ClientContractsPage = () => {
  const { user } = useAuth();
  const { navigateToClient } = useRoleNavigation();
  const { clientData } = useClientData();
  const { contracts, loading, error } = useClientContracts(user?.email);
  const [renewalContract, setRenewalContract] = useState<any>(null);

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
        const titles = equipmentData.map(item => item.title).filter(Boolean);
        if (titles.length > 0) {
          return titles.length > 1
            ? `${titles[0]} et ${titles.length - 1} autre(s) équipement(s)`
            : titles[0];
        }
      }
    } catch {
      return description;
    }
    return description;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-full">Actif</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="rounded-full">Terminé</Badge>;
      case 'contract_sent':
        return <Badge className="bg-blue-100 text-blue-700 border-0 rounded-full">Contrat envoyé</Badge>;
      case 'equipment_ordered':
        return <Badge className="bg-violet-100 text-violet-700 border-0 rounded-full">Équipement commandé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-0 rounded-full">En attente</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
    }
  };

  const getContractTimeline = (contract: any) => {
    const startDate = contract.contract_start_date ? parseISO(contract.contract_start_date) : null;
    const duration = contract.contract_duration || 36;
    
    if (!startDate) return null;

    const now = new Date();
    const monthsElapsed = differenceInMonths(now, startDate);
    const monthsRemaining = Math.max(0, duration - monthsElapsed);
    const progress = Math.min(100, Math.round((monthsElapsed / duration) * 100));
    const canRenew = monthsElapsed >= 18;

    return { monthsElapsed, monthsRemaining, progress, duration, canRenew, startDate };
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-2xl w-1/3" />
          <div className="h-4 bg-muted rounded-2xl w-1/2" />
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-muted rounded-2xl" />)}
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
            <p className="text-sm">Erreur lors du chargement des contrats : {error}</p>
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
        <h1 className="text-3xl font-bold tracking-tight">Mes Contrats</h1>
        <p className="text-muted-foreground">
          Consultez et gérez vos contrats de financement
        </p>
      </motion.div>

      <div className="grid gap-4">
        {contracts.map((contract) => {
          const timeline = getContractTimeline(contract);
          return (
            <motion.div key={contract.id} variants={itemVariants}>
              <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {formatEquipmentDescription(contract.equipment_description)}
                        </CardTitle>
                        <CardDescription>
                          {contract.contract_number ? `N° ${contract.contract_number} · ` : ""}
                          Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Mensualité</p>
                      <p className="text-lg font-semibold">{formatAmount(contract.monthly_payment)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Bailleur</p>
                      <p className="text-sm font-medium">{contract.leaser_name || 'Non spécifié'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Statut livraison</p>
                      <p className="text-sm font-medium">{contract.delivery_status || 'En attente'}</p>
                    </div>
                    <div className="flex items-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl"
                        onClick={() => navigateToClient(`contracts/${contract.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        Voir
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  {/* Contract Timeline */}
                  {timeline && contract.status === 'active' && (
                    <div className="p-4 rounded-xl bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            Progression du contrat
                          </span>
                        </div>
                        <span className="text-xs font-medium">
                          {timeline.monthsRemaining} mois restant{timeline.monthsRemaining > 1 ? "s" : ""}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="relative">
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              timeline.progress >= 75 ? "bg-orange-500" :
                              timeline.progress >= 50 ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${timeline.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {format(timeline.startDate, "MMM yyyy", { locale: fr })}
                          </span>
                          <span className="text-[10px] font-medium">
                            {timeline.monthsElapsed}/{timeline.duration} mois
                          </span>
                        </div>
                      </div>

                      {/* Renewal button */}
                      {timeline.canRenew && (
                        <Button
                          size="sm"
                          className="w-full gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenewalContract(contract);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Renouveler mon matériel
                        </Button>
                      )}
                    </div>
                  )}

                  {contract.tracking_number && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Numéro de suivi : {contract.tracking_number}
                      </p>
                      {contract.delivery_carrier && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Transporteur : {contract.delivery_carrier}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {contracts.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
              <h3 className="text-lg font-semibold mb-2">Aucun contrat</h3>
              <p className="text-muted-foreground text-center text-sm">
                Vous n'avez pas encore de contrats de financement.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Renewal Modal */}
      {renewalContract && clientData && (
        <RenewalRequestModal
          open={!!renewalContract}
          onOpenChange={(open) => !open && setRenewalContract(null)}
          contract={renewalContract}
          clientId={clientData.id}
          companyId={(clientData as any).company_id || ""}
        />
      )}
    </motion.div>
  );
};

export default ClientContractsPage;

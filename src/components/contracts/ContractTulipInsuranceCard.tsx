// Carte "Assurance Tulip" sur la fiche contrat.
// Visible uniquement si une clé API Tulip est configurée pour la société.
// Opt-in manuel : on assure le matériel une fois le contrat livré/sérialisé.

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Umbrella, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { areAllSerialNumbersComplete } from "@/services/invoiceService";
import {
  subscribeContractInsurance,
  cancelContractInsurance,
  TulipEnvironment,
} from "@/services/tulipInsuranceService";
import { Contract, ContractEquipment } from "@/services/contractService";

interface Props {
  contract: Contract;
  equipment: ContractEquipment[];
  companyId?: string;
  onUpdate: () => void;
}

const ENV_LABELS: Record<TulipEnvironment, string> = {
  sandbox: "Test (Sandbox)",
  production: "Production",
};

const ContractTulipInsuranceCard: React.FC<Props> = ({ contract, equipment, companyId, onUpdate }) => {
  const [tulipEnv, setTulipEnv] = useState<TulipEnvironment | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!companyId) return;
      const { data } = await supabase.rpc("get_tulip_integration_status", {
        p_company_id: companyId,
      });
      const envs = (data as { environments?: { sandbox: boolean; production: boolean } } | null)
        ?.environments;
      if (envs?.production) setTulipEnv("production");
      else if (envs?.sandbox) setTulipEnv("sandbox");
      else setTulipEnv(null);
    };
    fetchStatus();
  }, [companyId]);

  const isConfigured = !!tulipEnv;
  const isInsured = !!contract.tulip_contract_id;
  const hasMissingSerials = !areAllSerialNumbersComplete(equipment);

  const handleSubscribe = async () => {
    if (!tulipEnv) {
      toast.info("L'assurance Tulip sera bientôt disponible.");
      return;
    }
    setIsSubscribing(true);
    try {
      const result = await subscribeContractInsurance(contract.id, tulipEnv);
      if (result.success) {
        toast.success("Matériel assuré via Tulip");
        onUpdate();
      } else {
        toast.error(result.error || "Échec de la souscription Tulip");
      }
    } catch (error: any) {
      console.error("Erreur souscription Tulip:", error);
      toast.error(error.message || "Erreur lors de la souscription Tulip");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Résilier l'assurance Tulip de ce contrat ?")) return;
    setIsCancelling(true);
    try {
      const result = await cancelContractInsurance(contract.id, "Résiliation depuis Leazr");
      if (result.success) {
        toast.success("Assurance Tulip résiliée");
        onUpdate();
      } else {
        toast.error(result.error || "Échec de la résiliation");
      }
    } catch (error: any) {
      console.error("Erreur résiliation Tulip:", error);
      toast.error(error.message || "Erreur lors de la résiliation");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Umbrella className="h-5 w-5" /> Assurance Tulip
          {!isConfigured && !isInsured && (
            <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isConfigured
            ? `Assurance du matériel via Tulip (${ENV_LABELS[tulipEnv]})`
            : "Assurance du matériel via Tulip"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isInsured ? (
          <>
            <Badge variant="outline" className="flex w-fit items-center gap-1 text-green-700 border-green-300">
              <ShieldCheck className="h-4 w-4" /> Assuré
            </Badge>
            {contract.tulip_subscribed_at && (
              <p className="text-sm text-muted-foreground">
                Souscrit le {formatDate(contract.tulip_subscribed_at)}
              </p>
            )}
            {contract.tulip_contract_id && (
              <p className="text-xs text-muted-foreground">
                Réf. Tulip : <span className="font-mono">{contract.tulip_contract_id}</span>
              </p>
            )}
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              {isCancelling ? "Résiliation..." : "Résilier l'assurance"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Assurez le matériel de ce contrat (vol, casse, assistance, sans franchise).
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-fit">
                    <Button
                      onClick={handleSubscribe}
                      disabled={isSubscribing || (isConfigured && hasMissingSerials)}
                      className="flex items-center gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {isSubscribing ? "Souscription..." : "Assurer via Tulip"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {isConfigured && hasMissingSerials && (
                  <TooltipContent>
                    <p>Renseignez tous les numéros de série avant d'assurer le matériel</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {!isConfigured && (
              <p className="text-xs text-muted-foreground">Bientôt disponible.</p>
            )}
            {isConfigured && hasMissingSerials && (
              <p className="text-xs text-amber-600">
                Numéros de série requis (Tulip les exige pour un contrat longue durée).
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractTulipInsuranceCard;

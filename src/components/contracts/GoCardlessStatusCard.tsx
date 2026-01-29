import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface GoCardlessStatusCardProps {
  contract: {
    id: string;
    gocardless_customer_id?: string | null;
    gocardless_mandate_id?: string | null;
    gocardless_subscription_id?: string | null;
    gocardless_mandate_status?: string | null;
    gocardless_mandate_created_at?: string | null;
    monthly_payment?: number | null;
    is_self_leasing?: boolean;
  };
  onUpdate: () => void;
}

const GoCardlessStatusCard: React.FC<GoCardlessStatusCardProps> = ({ contract, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Ne pas afficher si ce n'est pas un contrat self-leasing
  if (!contract.is_self_leasing) {
    return null;
  }

  const hasMandate = !!contract.gocardless_mandate_id;
  const status = contract.gocardless_mandate_status;

  const getStatusBadge = () => {
    if (!status) return null;

    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      'pending_submission': { label: 'En attente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      'submitted': { label: 'Soumis', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      'active': { label: 'Actif', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
      'failed': { label: 'Échoué', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      'cancelled': { label: 'Annulé', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      'expired': { label: 'Expiré', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
      'payment_failed': { label: 'Paiement échoué', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      'subscription_cancelled': { label: 'Abo. annulé', variant: 'outline', icon: <XCircle className="h-3 w-3" /> },
      'subscription_finished': { label: 'Abo. terminé', variant: 'outline', icon: <CheckCircle2 className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' as const, icon: null };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const handleSetupMandate = async () => {
    setIsLoading(true);
    try {
      // Construire l'URL de retour
      const returnUrl = `${window.location.origin}/itakecare/gocardless/complete?contract_id=${contract.id}`;

      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
        body: { 
          contractId: contract.id,
          returnUrl 
        }
      });

      if (error) {
        console.error('Erreur création mandat:', error);
        toast.error(error.message || "Erreur lors de la création du mandat");
        return;
      }

      if (data?.authorisationUrl) {
        toast.success("Redirection vers GoCardless...");
        // Ouvrir dans un nouvel onglet
        window.open(data.authorisationUrl, '_blank');
        onUpdate();
      } else {
        toast.error("URL d'autorisation non reçue");
      }

    } catch (err) {
      console.error('Erreur inattendue:', err);
      toast.error("Erreur lors de la configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Domiciliation SEPA</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription className="text-xs">
          Prélèvement automatique via GoCardless
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {!hasMandate ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucune domiciliation configurée. Configurez un mandat SEPA pour automatiser les prélèvements mensuels.
            </p>
            <Button 
              onClick={handleSetupMandate}
              disabled={isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configuration...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Configurer la domiciliation
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mandat ID</span>
                <span className="font-mono">{contract.gocardless_mandate_id?.substring(0, 12)}...</span>
              </div>
              
              {contract.gocardless_subscription_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subscription</span>
                  <span className="font-mono">{contract.gocardless_subscription_id?.substring(0, 12)}...</span>
                </div>
              )}
              
              {contract.gocardless_mandate_created_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span>
                    {new Date(contract.gocardless_mandate_created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>

            {(status === 'failed' || status === 'cancelled' || status === 'expired') && (
              <Button 
                onClick={handleSetupMandate}
                disabled={isLoading}
                variant="outline"
                className="w-full mt-2"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reconfigurer
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoCardlessStatusCard;

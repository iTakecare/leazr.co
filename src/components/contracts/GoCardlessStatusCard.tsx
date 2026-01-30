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
  RefreshCw,
  Copy,
  Mail,
  X,
  Info
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GoCardlessStatusCardProps {
  contract: {
    id: string;
    gocardless_customer_id?: string | null;
    gocardless_mandate_id?: string | null;
    gocardless_subscription_id?: string | null;
    gocardless_mandate_status?: string | null;
    gocardless_mandate_created_at?: string | null;
    gocardless_billing_request_id?: string | null;
    gocardless_billing_request_flow_url?: string | null;
    monthly_payment?: number | null;
    is_self_leasing?: boolean;
    sepa_status?: string | null;
    sepa_activated_at?: string | null;
  };
  onUpdate: () => void;
}

type SepaStatus = 'none' | 'pending' | 'active' | 'failed';

const GoCardlessStatusCard: React.FC<GoCardlessStatusCardProps> = ({ contract, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Ne pas afficher si ce n'est pas un contrat self-leasing
  if (!contract.is_self_leasing) {
    return null;
  }

  // Determine SEPA status from contract fields
  const getSepaStatus = (): SepaStatus => {
    // Priority to sepa_status field if present
    if (contract.sepa_status) {
      return contract.sepa_status as SepaStatus;
    }
    
    // Fallback logic for backward compatibility
    const mandateStatus = contract.gocardless_mandate_status;
    
    if (!mandateStatus || !contract.gocardless_mandate_id) {
      if (contract.gocardless_billing_request_id) {
        return 'pending';
      }
      return 'none';
    }
    
    if (mandateStatus === 'active') return 'active';
    if (['pending_submission', 'submitted'].includes(mandateStatus)) return 'pending';
    if (['failed', 'cancelled', 'expired', 'payment_failed'].includes(mandateStatus)) return 'failed';
    
    return 'none';
  };

  const sepaStatus = getSepaStatus();

  const handleSetupMandate = async () => {
    setIsLoading(true);
    try {
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

      if (data?.code === 'KYC_REQUIRED') {
        toast.error("La vérification GoCardless n'est pas complète. Finalisez-la dans les paramètres.");
        return;
      }

      if (data?.authorisationUrl) {
        toast.success("Redirection vers GoCardless...");
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

  const handleCopyLink = async () => {
    if (!contract.gocardless_billing_request_flow_url) {
      toast.error("Lien non disponible");
      return;
    }

    try {
      await navigator.clipboard.writeText(contract.gocardless_billing_request_flow_url);
      toast.success("Lien copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleResendLink = async () => {
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('gocardless-resend-mandate-link', {
        body: { contractId: contract.id }
      });

      if (error) {
        console.error('Erreur renvoi lien:', error);
        toast.error(error.message || "Erreur lors de l'envoi");
        return;
      }

      toast.success("Lien de signature envoyé par email");
    } catch (err) {
      console.error('Erreur inattendue:', err);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsResending(false);
    }
  };

  const handleCancelRequest = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('gocardless-cancel-billing-request', {
        body: { contractId: contract.id }
      });

      if (error) {
        console.error('Erreur annulation:', error);
        toast.error(error.message || "Erreur lors de l'annulation");
        return;
      }

      toast.success("Demande de mandat annulée");
      onUpdate();
    } catch (err) {
      console.error('Erreur inattendue:', err);
      toast.error("Erreur lors de l'annulation");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig: Record<SepaStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      'none': { label: 'Non configuré', variant: 'outline', icon: null },
      'pending': { label: 'En attente de signature', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      'active': { label: 'Actif', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
      'failed': { label: 'Échoué', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[sepaStatus];
    if (sepaStatus === 'none') return null;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Render based on SEPA status
  const renderContent = () => {
    switch (sepaStatus) {
      case 'none':
        return (
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
        );

      case 'pending':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Mandat SEPA en cours de validation. Le client doit signer le mandat.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!contract.gocardless_billing_request_flow_url}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copier le lien
              </Button>
              
              <Button 
                onClick={handleResendLink}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isResending}
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Renvoyer le lien
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive"
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-2 h-4 w-4" />
                    )}
                    Annuler la demande
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annuler la demande de mandat ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action annulera la demande de signature en cours. Le client ne pourra plus signer ce mandat. Vous pourrez en créer un nouveau si nécessaire.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non, garder</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelRequest}>
                      Oui, annuler
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );

      case 'active':
        return (
          <div className="space-y-3">
            <div className="text-xs space-y-2">
              {contract.gocardless_mandate_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Référence mandat</span>
                  <span className="font-mono">{contract.gocardless_mandate_id.substring(0, 12)}...</span>
                </div>
              )}
              
              {(contract.sepa_activated_at || contract.gocardless_mandate_created_at) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Activé le</span>
                  <span>
                    {new Date(contract.sepa_activated_at || contract.gocardless_mandate_created_at!).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Les prélèvements mensuels seront collectés automatiquement selon les termes du contrat.
              </p>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">
                Le mandat SEPA a été annulé ou a expiré. Reconfigurez la domiciliation pour réactiver les prélèvements automatiques.
              </p>
            </div>
            
            <Button 
              onClick={handleSetupMandate}
              disabled={isLoading}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reconfigurer la domiciliation
            </Button>
          </div>
        );
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
      
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default GoCardlessStatusCard;

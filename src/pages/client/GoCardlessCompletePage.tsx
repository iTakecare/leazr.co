import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const GoCardlessCompletePage: React.FC = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const completeFlow = async () => {
      try {
        // Récupérer les paramètres de la query string
        const billingRequestId = searchParams.get('billing_request_id');
        const contractId = searchParams.get('contract_id');

        console.log('GoCardless Complete - Params:', { billingRequestId, contractId });

        if (!billingRequestId || !contractId) {
          setErrorMessage('Paramètres manquants dans l\'URL');
          setStatus('error');
          return;
        }

        // Appeler l'edge function pour finaliser
        const { data, error } = await supabase.functions.invoke('gocardless-complete-flow', {
          body: { billingRequestId, contractId }
        });

        if (error) {
          console.error('Erreur completion:', error);
          setErrorMessage(error.message || 'Erreur lors de la finalisation');
          setStatus('error');
          return;
        }

        if (data?.success) {
          setStatus('success');
          // Redirection vers la page de succès après 2 secondes
          setTimeout(() => {
            navigate(`/${companySlug}/gocardless/success?contract_id=${contractId}`);
          }, 2000);
        } else {
          setErrorMessage(data?.error || 'Erreur inconnue');
          setStatus('error');
        }

      } catch (err) {
        console.error('Erreur inattendue:', err);
        setErrorMessage('Une erreur inattendue s\'est produite');
        setStatus('error');
      }
    };

    completeFlow();
  }, [searchParams, companySlug, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Finalisation en cours...</h2>
              <p className="text-muted-foreground">
                Nous configurons votre domiciliation SEPA. Veuillez patienter.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold text-green-700">Configuration réussie !</h2>
              <p className="text-muted-foreground">
                Votre domiciliation SEPA a été configurée avec succès.
                Redirection en cours...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Erreur</h2>
              <p className="text-muted-foreground">{errorMessage}</p>
              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  Réessayer
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => window.close()}
                >
                  Fermer cette page
                </Button>
              </div>
              <div className="pt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Contactez-nous si le problème persiste</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoCardlessCompletePage;

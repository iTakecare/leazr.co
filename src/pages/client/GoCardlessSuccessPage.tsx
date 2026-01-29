import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, Calendar, Euro, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ContractInfo {
  client_name: string;
  monthly_payment: number;
  contract_start_date: string | null;
  gocardless_mandate_id: string | null;
}

const GoCardlessSuccessPage: React.FC = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [searchParams] = useSearchParams();
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      const contractId = searchParams.get('contract_id');
      
      if (!contractId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('client_name, monthly_payment, contract_start_date, gocardless_mandate_id')
          .eq('id', contractId)
          .maybeSingle();

        if (!error && data) {
          setContract(data);
        }
      } catch (err) {
        console.error('Erreur chargement contrat:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [searchParams]);

  // Calculer la prochaine date de prélèvement (1er du mois prochain)
  const getNextPaymentDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">
            Domiciliation configurée !
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Votre mandat de prélèvement SEPA a été créé avec succès. 
            Vos paiements seront automatiquement prélevés chaque mois.
          </p>

          {!loading && contract && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Récapitulatif
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contract.client_name}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-semibold">{formatCurrency(contract.monthly_payment || 0)}</span>
                    <span className="text-muted-foreground"> / mois</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Prochain prélèvement : {getNextPaymentDate()}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Référence : {contract.gocardless_mandate_id?.substring(0, 12)}...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              Informations importantes
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Un email de confirmation vous sera envoyé</li>
              <li>Le premier prélèvement sera effectué le 1er du mois prochain</li>
              <li>Vous pouvez annuler le mandat à tout moment</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button 
              variant="default"
              onClick={() => window.close()}
              className="w-full"
            >
              Fermer cette page
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Vous pouvez fermer cette page en toute sécurité.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoCardlessSuccessPage;

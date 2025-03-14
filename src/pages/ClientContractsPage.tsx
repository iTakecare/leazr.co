
import React, { useEffect } from "react";
import { useClientContracts } from "@/hooks/useClientContracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { File, RefreshCw, AlertCircle, Box, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";

const ClientContractsPage = () => {
  const { contracts, loading, error, refresh, debug } = useClientContracts();
  const params = useParams();
  const clientId = params.id;

  useEffect(() => {
    // Log diagnostic information when component mounts
    console.log("ClientContractsPage - clientId from params:", clientId);
    console.log("ClientContractsPage - Contracts loaded:", contracts?.length || 0);
    
    // Force a refresh if there's a clientId in the URL
    if (clientId) {
      console.log("Forcing refresh for specific client:", clientId);
      refresh(clientId);
    }
  }, [clientId]);

  const handleRefresh = () => {
    toast.info("Actualisation des contrats...");
    refresh(clientId);
  };

  const handleDebug = () => {
    debug();
    toast.info("Vérification des contrats en cours, consultez la console.");
  };

  if (loading) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erreur</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
                </Button>
                <Button onClick={handleDebug} variant="secondary">
                  Diagnostic
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aucun contrat trouvé</h2>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de contrats actifs.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
                </Button>
                <Button onClick={handleDebug} variant="secondary">
                  Diagnostic
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Contrats</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button onClick={handleDebug} variant="ghost" size="sm">
            Diagnostic
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{contract.equipment_description || "Équipement"}</CardTitle>
                  <CardDescription>
                    Contrat avec {contract.leaser_name}
                  </CardDescription>
                </div>
                {contract.leaser_logo && (
                  <img 
                    src={contract.leaser_logo} 
                    alt={contract.leaser_name} 
                    className="h-8 object-contain" 
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut:</span>
                  <span className="font-medium capitalize">
                    {contract.status === "active" 
                      ? "Actif" 
                      : contract.status === "contract_sent" 
                        ? "Contrat envoyé" 
                        : contract.status === "equipment_ordered"
                          ? "Équipement commandé"
                          : contract.status === "delivered"
                            ? "Livré"
                            : contract.status === "completed"
                              ? "Terminé"
                              : contract.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loyer mensuel:</span>
                  <span className="font-medium">{formatCurrency(contract.monthly_payment)}</span>
                </div>
                {contract.tracking_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Numéro de suivi:</span>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">{contract.tracking_number}</span>
                      {contract.delivery_carrier === "bpost" && (
                        <a 
                          href={`https://track.bpost.be/btr/web/#/search?itemCode=${contract.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {contract.estimated_delivery && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison estimée:</span>
                    <span className="font-medium">{contract.estimated_delivery}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Créé le {new Date(contract.created_at).toLocaleDateString()}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClientContractsPage;

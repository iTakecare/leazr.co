
import React from "react";
import { useClientContracts } from "@/hooks/useClientContracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { File, Package, RefreshCw } from "lucide-react";

const ClientContractsPage = () => {
  const { contracts, loading, error, refresh } = useClientContracts();

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
              <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erreur</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aucun contrat trouvé</h2>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de contrats actifs.
              </p>
              <Button onClick={refresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
              </Button>
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
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
        </Button>
      </div>

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <CardHeader>
              <CardTitle>{contract.equipment_description || "Équipement"}</CardTitle>
              <CardDescription>
                Contrat avec {contract.leaser_name}
              </CardDescription>
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
                    <span className="font-medium">{contract.tracking_number}</span>
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

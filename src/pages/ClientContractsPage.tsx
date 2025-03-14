
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientContracts, ClientContract } from "@/hooks/useClientContracts";
import ClientsError from "@/components/clients/ClientsError";
import ContractDetailCard from "@/components/contracts/ContractDetailCard";
import { formatCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const ClientContractsPage = () => {
  const { contracts, loading, error, refresh } = useClientContracts();

  if (loading) {
    return (
      <div className="w-full p-8">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <div className="flex flex-col justify-center items-center min-h-[300px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Chargement des contrats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ClientsError errorMessage={error} onRetry={refresh} />;
  }

  // Mock function for onStatusChange that returns a Promise
  const handleStatusChange = async (contractId: string, status: string, reason?: string) => {
    console.log("Status change requested:", { contractId, status, reason });
    // In a real implementation, this would call an API
    return Promise.resolve();
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
      
      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-medium">Aucun contrat trouvé</h3>
              <p className="text-muted-foreground mt-2">
                Vous n'avez pas encore de contrats actifs.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {contracts.map((contract: ClientContract) => (
            <ContractDetailCard
              key={contract.id}
              contract={contract}
              onStatusChange={handleStatusChange}
              isUpdatingStatus={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientContractsPage;


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientContracts, ClientContract } from "@/hooks/useClientContracts";
import { ClientsError } from "@/components/clients/ClientsError";
import ContractDetailCard from "@/components/contracts/ContractDetailCard";
import { formatCurrency } from "@/utils/formatters";

const ClientContractsPage = () => {
  const { contracts, loading, error, refresh } = useClientContracts();

  if (loading) {
    return (
      <div className="w-full p-8">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <div className="flex justify-center items-center min-h-[300px]">
          <p>Chargement des contrats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ClientsError errorMessage={error} onRetry={refresh} />;
  }

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
              onStatusChange={() => {}}
              isUpdatingStatus={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientContractsPage;

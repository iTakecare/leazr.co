import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, History, ChevronDown, ChevronUp, LayoutGrid, List, FileText, ScrollText } from "lucide-react";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useClientContracts } from "@/hooks/useClientContracts";
import ClientOfferCard from "./ClientOfferCard";
import ClientContractCard from "./ClientContractCard";
import ClientOffersTableLight from "./ClientOffersTableLight";
import ClientContractsTableLight from "./ClientContractsTableLight";

interface ClientCommercialHistoryProps {
  clientId: string;
  clientEmail?: string;
}

const ClientCommercialHistory: React.FC<ClientCommercialHistoryProps> = ({
  clientId,
  clientEmail
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  const { offers, loading: offersLoading } = useClientOffers(clientEmail, clientId);
  const { contracts, loading: contractsLoading } = useClientContracts(clientEmail, clientId);

  const isLoading = offersLoading || contractsLoading;
  const totalCount = offers.length + contracts.length;

  if (totalCount === 0 && !isLoading) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-primary" />
            <span className="font-medium">Historique commercial</span>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="secondary" className="ml-2">
                {offers.length} demande{offers.length > 1 ? 's' : ''}, {contracts.length} contrat{contracts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Chargement...</span>
          </div>
        ) : (
          <Tabs defaultValue="offers" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="offers" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Demandes ({offers.length})
                </TabsTrigger>
                <TabsTrigger value="contracts" className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4" />
                  Contrats ({contracts.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode('cards')}
                  title="Vue cartes"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode('table')}
                  title="Vue tableau"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="offers" className="mt-0">
              {offers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune demande pour ce client
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offers.map((offer) => (
                    <ClientOfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              ) : (
                <ClientOffersTableLight offers={offers} />
              )}
            </TabsContent>

            <TabsContent value="contracts" className="mt-0">
              {contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun contrat pour ce client
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contracts.map((contract) => (
                    <ClientContractCard key={contract.id} contract={contract} />
                  ))}
                </div>
              ) : (
                <ClientContractsTableLight contracts={contracts} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ClientCommercialHistory;

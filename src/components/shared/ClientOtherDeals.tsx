import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { History, ChevronDown, Loader2 } from "lucide-react";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useClientContracts } from "@/hooks/useClientContracts";
import ClientOtherDealsList from "./ClientOtherDealsList";

interface ClientOtherDealsProps {
  clientId?: string;
  clientEmail?: string;
  currentOfferId?: string;
  currentContractId?: string;
  compact?: boolean;
}

const ClientOtherDeals: React.FC<ClientOtherDealsProps> = ({
  clientId,
  clientEmail,
  currentOfferId,
  currentContractId,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const { offers: allOffers, loading: offersLoading } = useClientOffers(
    clientEmail || undefined,
    clientId || undefined
  );
  const { contracts: allContracts, loading: contractsLoading } = useClientContracts(
    clientEmail || undefined,
    clientId || undefined
  );

  const isLoading = offersLoading || contractsLoading;

  // Filter out current offer/contract
  const offers = allOffers.filter((o) => o.id !== currentOfferId);
  const contracts = allContracts.filter((c) => c.id !== currentContractId);

  const totalCount = offers.length + contracts.length;

  // Don't render anything if no other deals
  if (!isLoading && totalCount === 0) {
    return null;
  }

  const getSummaryText = () => {
    const parts = [];
    if (offers.length > 0) {
      parts.push(`${offers.length} demande${offers.length > 1 ? "s" : ""}`);
    }
    if (contracts.length > 0) {
      parts.push(`${contracts.length} contrat${contracts.length > 1 ? "s" : ""}`);
    }
    return parts.join(", ");
  };

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Autres dossiers</span>
            </div>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {totalCount}
                </Badge>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <ClientOtherDealsList
            offers={offers}
            contracts={contracts}
            compact={compact}
          />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Autres dossiers de ce client</span>
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {getSummaryText()}
              </Badge>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <ClientOtherDealsList
          offers={offers}
          contracts={contracts}
          compact={compact}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ClientOtherDeals;

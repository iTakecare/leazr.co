
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OffersTable from "./OffersTable";

interface Offer {
  id: string;
  client_name: string;
  amount: number;
  monthly_payment: number;
  commission: number;
  status: string;
  created_at: string;
}

interface OffersFilterProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filteredOffers: Offer[];
  onDeleteOffer: (id: string) => Promise<void>;
  onResendOffer: (id: string) => void;
  onDownloadPdf: (id: string) => void;
}

const OffersFilter = ({
  activeTab,
  setActiveTab,
  filteredOffers,
  onDeleteOffer,
  onResendOffer,
  onDownloadPdf
}: OffersFilterProps) => {
  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="all">Toutes</TabsTrigger>
        <TabsTrigger value="accepted">Acceptées</TabsTrigger>
        <TabsTrigger value="pending">En attente</TabsTrigger>
        <TabsTrigger value="rejected">Refusées</TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab}>
        <OffersTable
          offers={filteredOffers}
          onDeleteOffer={onDeleteOffer}
          onResendOffer={onResendOffer}
          onDownloadPdf={onDownloadPdf}
        />
      </TabsContent>
    </Tabs>
  );
};

export default OffersFilter;

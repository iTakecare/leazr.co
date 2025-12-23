
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OffersFilterProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  activeType: string;
  onTypeChange: (value: string) => void;
  activeSource: string;
  onSourceChange: (value: string) => void;
  hideTypeFilter?: boolean;
}

const OffersFilter = ({ 
  activeTab, 
  onTabChange, 
  activeType, 
  onTypeChange, 
  activeSource,
  onSourceChange,
  hideTypeFilter = false 
}: OffersFilterProps) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="in_progress">À traiter</TabsTrigger>
            <TabsTrigger value="accepted">Acceptées</TabsTrigger>
            <TabsTrigger value="invoiced">Facturé</TabsTrigger>
            <TabsTrigger value="rejected">Refusées</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {!hideTypeFilter && (
          <>
            <Tabs value={activeType} onValueChange={onTypeChange} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">Tous types</TabsTrigger>
                <TabsTrigger value="admin_offer">Mes demandes</TabsTrigger>
                <TabsTrigger value="client_request">Demandes clients</TabsTrigger>
                <TabsTrigger value="web_request">Demandes web</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Tabs value={activeSource} onValueChange={onSourceChange} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">Toutes sources</TabsTrigger>
                <TabsTrigger value="meta">Meta Ads</TabsTrigger>
                <TabsTrigger value="custom_pack">Packs perso.</TabsTrigger>
                <TabsTrigger value="web_catalog">Catalogue</TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default OffersFilter;


import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OffersFilterProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  activeType: string;
  onTypeChange: (value: string) => void;
}

const OffersFilter = ({ activeTab, onTabChange, activeType, onTypeChange }: OffersFilterProps) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="draft">Brouillons</TabsTrigger>
            <TabsTrigger value="in_progress">En cours</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs value={activeType} onValueChange={onTypeChange} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Tous types</TabsTrigger>
            <TabsTrigger value="admin_offer">Mes offres</TabsTrigger>
            <TabsTrigger value="client_request">Demandes clients</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

export default OffersFilter;

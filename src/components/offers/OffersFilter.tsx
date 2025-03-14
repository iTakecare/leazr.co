
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

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
        <Tabs defaultValue={activeTab} onValueChange={onTabChange} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="accepted">Acceptées</TabsTrigger>
            <TabsTrigger value="rejected">Refusées</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs defaultValue={activeType} onValueChange={onTypeChange} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Tous types</TabsTrigger>
            <TabsTrigger value="admin_offer">Mes offres</TabsTrigger>
            <TabsTrigger value="client_request">Demandes clients</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <Button asChild className="shadow-md bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
        <Link to="/create-offer">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle offre
        </Link>
      </Button>
    </div>
  );
};

export default OffersFilter;

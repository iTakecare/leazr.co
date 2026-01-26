
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
          <TabsList className="bg-slate-100 rounded-lg p-1 border-0">
            <TabsTrigger value="in_progress" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">À traiter</TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Acceptées</TabsTrigger>
            <TabsTrigger value="invoiced" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Facturé</TabsTrigger>
            <TabsTrigger value="without_follow_up" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Sans suite</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Refusées</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {!hideTypeFilter && (
          <>
            <Tabs value={activeType} onValueChange={onTypeChange} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 rounded-lg p-1 border-0">
                <TabsTrigger value="all" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Tous types</TabsTrigger>
                <TabsTrigger value="admin_offer" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Mes demandes</TabsTrigger>
                <TabsTrigger value="client_request" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Demandes clients</TabsTrigger>
                <TabsTrigger value="web_request" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Demandes web</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Tabs value={activeSource} onValueChange={onSourceChange} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 rounded-lg p-1 border-0">
                <TabsTrigger value="all" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Toutes sources</TabsTrigger>
                <TabsTrigger value="meta" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Meta Ads</TabsTrigger>
                <TabsTrigger value="custom_pack" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Packs perso.</TabsTrigger>
                <TabsTrigger value="web_catalog" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Catalogue</TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default OffersFilter;

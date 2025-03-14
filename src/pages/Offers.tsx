
import React, { useState, useEffect } from "react";
import { useOffers } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Grid, List, Filter, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTransition from "@/components/layout/PageTransition";
import OffersKanban from "@/components/offers/OffersKanban";
import OffersHeader from "@/components/offers/OffersHeader";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Offers = () => {
  const {
    filteredOffers,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    isUpdatingStatus,
    includeConverted,
    setIncludeConverted,
    fetchOffers
  } = useOffers();
  
  const [viewMode, setViewMode] = useState<'kanban'>('kanban');
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="w-full p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <OffersHeader />
          <Button asChild>
            <Link to="/create-offer" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle offre
            </Link>
          </Button>
        </div>
        
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
          <OffersFilter 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            activeType={activeType}
            onTypeChange={setActiveType}
          />
          
          <div className="flex items-center gap-2">
            <OffersSearch value={searchTerm} onChange={setSearchTerm} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-between p-2">
                  <Label htmlFor="show-converted" className="flex items-center cursor-pointer">
                    <span>Inclure les offres converties</span>
                  </Label>
                  <Switch 
                    id="show-converted"
                    checked={includeConverted}
                    onCheckedChange={setIncludeConverted}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {loading ? (
          <OffersLoading />
        ) : loadingError ? (
          <OffersError message={loadingError} onRetry={fetchOffers} />
        ) : (
          <OffersKanban
            offers={filteredOffers}
            onStatusChange={handleUpdateWorkflowStatus}
            isUpdatingStatus={isUpdatingStatus}
            onDeleteOffer={handleDeleteOffer}
            includeConverted={includeConverted}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default Offers;

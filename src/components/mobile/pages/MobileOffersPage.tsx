import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Filter, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Offer } from "@/hooks/offers/useFetchOffers";
import MobileLayout from "../MobileLayout";
import MobileOfferCard from "../cards/MobileOfferCard";
import MobileFilterSheet from "../MobileFilterSheet";
import MobileFAB from "../MobileFAB";
import MobileSearchSheet from "../MobileSearchSheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface MobileOffersPageProps {
  offers: Offer[];
  loading?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeType: string;
  onTypeChange: (type: string) => void;
  activeSource: string;
  onSourceChange: (source: string) => void;
  onDeleteOffer: (id: string) => void;
  onRefresh?: () => void;
  includeConverted?: boolean;
  onIncludeConvertedChange?: (value: boolean) => void;
}

// KPI Stats component for mobile
const MobileKPIStats: React.FC<{ offers: Offer[] }> = ({ offers }) => {
  const stats = [
    {
      label: "Total",
      value: offers.length,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Brouillons",
      value: offers.filter(o => o.workflow_status === 'draft').length,
      color: "bg-muted text-muted-foreground",
    },
    {
      label: "En attente",
      value: offers.filter(o => ['sent', 'pending'].includes(o.workflow_status || '')).length,
      color: "bg-secondary text-secondary-foreground",
    },
    {
      label: "Signées",
      value: offers.filter(o => o.workflow_status === 'signed').length,
      color: "bg-primary/20 text-primary",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            "flex-shrink-0 px-4 py-3 rounded-xl min-w-[90px]",
            stat.color
          )}
        >
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-xs opacity-80">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

const MobileOffersPage: React.FC<MobileOffersPageProps> = ({
  offers,
  loading,
  searchTerm,
  onSearchChange,
  activeTab,
  onTabChange,
  activeType,
  onTypeChange,
  activeSource,
  onSourceChange,
  onDeleteOffer,
  onRefresh,
  includeConverted,
  onIncludeConvertedChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  // Extract company slug from path
  const getCompanySlug = () => {
    const pathMatch = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/);
    return pathMatch?.[1] || null;
  };

  const companySlug = getCompanySlug();
  const basePrefix = companySlug ? `/${companySlug}` : '';

  // Filter groups for bottom sheet
  const filterGroups = [
    {
      id: 'status',
      label: 'Statut',
      options: [
        { value: 'all', label: 'Tous' },
        { value: 'draft', label: 'Brouillons' },
        { value: 'sent', label: 'Envoyées' },
        { value: 'pending', label: 'En attente' },
        { value: 'approved', label: 'Approuvées' },
        { value: 'signed', label: 'Signées' },
      ],
    },
    {
      id: 'type',
      label: 'Type',
      options: [
        { value: 'all', label: 'Tous' },
        { value: 'leasing', label: 'Leasing' },
        { value: 'purchase', label: 'Achat' },
        { value: 'operating_lease', label: 'Loc. exploitation' },
      ],
    },
    {
      id: 'source',
      label: 'Source',
      options: [
        { value: 'all', label: 'Toutes' },
        { value: 'internal', label: 'Interne' },
        { value: 'catalog', label: 'Catalogue' },
        { value: 'ambassador', label: 'Ambassadeur' },
      ],
    },
  ];

  const activeFilters = {
    status: activeTab === 'all' ? [] : [activeTab],
    type: activeType === 'all' ? [] : [activeType],
    source: activeSource === 'all' ? [] : [activeSource],
  };

  const handleFiltersChange = (filters: Record<string, string[]>) => {
    const status = filters.status?.[0] || 'all';
    const type = filters.type?.[0] || 'all';
    const source = filters.source?.[0] || 'all';
    
    onTabChange(status);
    onTypeChange(type);
    onSourceChange(source);
  };

  const handleResetFilters = () => {
    onTabChange('all');
    onTypeChange('all');
    onSourceChange('all');
    onSearchChange('');
  };

  const handleOfferClick = (offer: Offer) => {
    navigate(`${basePrefix}/admin/offers/${offer.id}`);
  };

  const handleCreateOffer = () => {
    navigate(`${basePrefix}/admin/create-offer`);
  };

  const activeFiltersCount = [activeTab, activeType, activeSource].filter(v => v !== 'all').length;

  return (
    <MobileLayout
      title="Demandes"
      showSearch={true}
      onSearchClick={() => setSearchSheetOpen(true)}
    >
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Mes demandes</h1>
          <p className="text-sm text-muted-foreground">
            Gérez et suivez vos demandes
          </p>
        </div>

        {/* KPI Stats - Horizontal scroll */}
        <MobileKPIStats offers={offers} />

        {/* Quick filters row */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterSheetOpen(true)}
            className={cn(
              "flex-1 justify-between",
              activeFiltersCount > 0 && "border-primary text-primary"
            )}
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </span>
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          )}
        </div>

        {/* Offers list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune demande trouvée</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleCreateOffer}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer une demande
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-0"
          >
            <AnimatePresence>
              {offers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <MobileOfferCard
                    offer={offer}
                    onClick={() => handleOfferClick(offer)}
                    onDelete={() => onDeleteOffer(offer.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Summary */}
        {offers.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pb-4">
            {offers.length} demande{offers.length > 1 ? 's' : ''} • 
            Total: {formatCurrency(offers.reduce((sum, o) => sum + (Number(o.amount) || 0), 0))}
          </div>
        )}
      </div>

      {/* FAB for creating new offer */}
      <MobileFAB
        primaryAction={{
          id: 'create-offer',
          icon: Plus,
          label: 'Nouvelle demande',
          href: `${basePrefix}/admin/create-offer`,
        }}
      />

      {/* Filter Sheet */}
      <MobileFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        resultCount={offers.length}
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Rechercher une demande..."
      />

      {/* Search Sheet */}
      <MobileSearchSheet
        open={searchSheetOpen}
        onClose={() => setSearchSheetOpen(false)}
        onSearch={onSearchChange}
        placeholder="Rechercher par client, référence..."
      />
    </MobileLayout>
  );
};

export default MobileOffersPage;

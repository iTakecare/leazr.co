import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Filter, RefreshCw, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "../MobileLayout";
import MobileContractCard from "../cards/MobileContractCard";
import MobileFilterSheet from "../MobileFilterSheet";
import MobileSearchSheet from "../MobileSearchSheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface Contract {
  id: string;
  reference?: string;
  client_name: string;
  client_company?: string | null;
  client_email?: string | null;
  monthly_payment?: number;
  total_amount?: number;
  start_date?: string;
  end_date?: string;
  duration?: number;
  status?: string;
}

interface MobileContractsPageProps {
  contracts: Contract[];
  loading?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onRefresh?: () => void;
  onStatusChange?: (contractId: string, status: string) => void;
  onDeleteContract?: (contractId: string) => void;
}

// Status stats component
const MobileContractStats: React.FC<{ contracts: Contract[] }> = ({ contracts }) => {
  const stats = [
    {
      label: "Total",
      value: contracts.length,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Actifs",
      value: contracts.filter(c => c.status === 'active').length,
      color: "bg-primary/20 text-primary",
    },
    {
      label: "En attente",
      value: contracts.filter(c => c.status === 'pending').length,
      color: "bg-secondary text-secondary-foreground",
    },
    {
      label: "Terminés",
      value: contracts.filter(c => c.status === 'completed').length,
      color: "bg-muted text-muted-foreground",
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

const MobileContractsPage: React.FC<MobileContractsPageProps> = ({
  contracts,
  loading,
  searchTerm,
  onSearchChange,
  activeStatusFilter,
  onStatusFilterChange,
  onRefresh,
  onStatusChange,
  onDeleteContract,
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
        { value: 'active', label: 'Actifs' },
        { value: 'pending', label: 'En attente' },
        { value: 'pending_signature', label: 'Signature en attente' },
        { value: 'delivered', label: 'Livrés' },
        { value: 'completed', label: 'Terminés' },
      ],
    },
  ];

  const activeFilters = {
    status: activeStatusFilter === 'all' ? [] : [activeStatusFilter],
  };

  const handleFiltersChange = (filters: Record<string, string[]>) => {
    const status = filters.status?.[0] || 'all';
    onStatusFilterChange(status);
  };

  const handleResetFilters = () => {
    onStatusFilterChange('all');
    onSearchChange('');
  };

  const handleContractClick = (contract: Contract) => {
    navigate(`${basePrefix}/admin/contracts/${contract.id}`);
  };

  const activeFiltersCount = activeStatusFilter !== 'all' ? 1 : 0;

  // Calculate total monthly value
  const totalMonthly = contracts.reduce((sum, c) => sum + (c.monthly_payment || 0), 0);

  return (
    <MobileLayout
      title="Contrats"
      showSearch={true}
      onSearchClick={() => setSearchSheetOpen(true)}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Mes contrats</h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos contrats actifs
            </p>
          </div>
        </div>

        {/* Stats - Horizontal scroll */}
        <MobileContractStats contracts={contracts} />

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
              Filtrer par statut
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

        {/* Contracts list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun contrat trouvé</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-0"
          >
            <AnimatePresence>
              {contracts.map((contract, index) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <MobileContractCard
                    contract={contract}
                    onClick={() => handleContractClick(contract)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Summary */}
        {contracts.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pb-4">
            {contracts.length} contrat{contracts.length > 1 ? 's' : ''} • 
            Mensualité totale: {formatCurrency(totalMonthly)}
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      <MobileFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        resultCount={contracts.length}
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Rechercher un contrat..."
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

export default MobileContractsPage;

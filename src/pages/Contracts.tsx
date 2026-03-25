import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { useContracts } from "@/hooks/useContracts";
import { FileText, Search, Grid, List, TrendingUp, Clock, AlertTriangle, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ContractsKanban from "@/components/contracts/ContractsKanban";
import { contractStatuses } from "@/services/contractService";
import ContractsAdvancedFilters from "@/components/contracts/ContractsAdvancedFilters";
import ContractsTable from "@/components/contracts/ContractsTable";
import ContractsEmptyState from "@/components/contracts/ContractsEmptyState";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileContractsPage } from "@/components/mobile/pages";

const STATUS_FILTERS = [
  { value: "all",                          label: "Tous" },
  { value: "in_progress",                  label: "En cours" },
  { value: contractStatuses.ACTIVE,        label: "Actifs" },
  { value: "expiring_soon",                label: "Expiration proche" },
  { value: contractStatuses.CONTRACT_SIGNED, label: "Signés" },
  { value: "self_leasing",                 label: "Self-Leasing" },
  { value: contractStatuses.COMPLETED,     label: "Terminés" },
  { value: contractStatuses.CANCELLED,     label: "Annulés" },
];

const Contracts = () => {
  const isMobile = useIsMobile();
  const {
    contracts,
    filteredContracts,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeStatusFilter,
    setActiveStatusFilter,
    isUpdatingStatus,
    isDeleting,
    fetchContracts,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    handleDeleteContract,
    viewMode,
    setViewMode,
    includeCompleted,
    setIncludeCompleted,
    advancedFilters,
    setAdvancedFilters,
    availableLeasers,
    availableDurations,
  } = useContracts();

  if (isMobile) {
    return (
      <MobileContractsPage
        contracts={filteredContracts}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeStatusFilter={activeStatusFilter}
        onStatusFilterChange={setActiveStatusFilter}
        onRefresh={fetchContracts}
        onStatusChange={handleUpdateContractStatus}
        onDeleteContract={handleDeleteContract}
      />
    );
  }

  // KPI computations on full contracts list
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const activeContracts = contracts.filter(c =>
    [contractStatuses.ACTIVE, contractStatuses.CONTRACT_SIGNED, "in_progress"].includes(c.status)
  );
  const totalMonthly = activeContracts.reduce((sum, c) => sum + (c.adjusted_monthly_payment || c.monthly_payment || 0), 0);
  const expiringCount = contracts.filter(c =>
    c.contract_end_date &&
    new Date(c.contract_end_date) <= threeMonthsFromNow &&
    new Date(c.contract_end_date) >= new Date() &&
    c.status !== contractStatuses.COMPLETED
  ).length;
  const inDeliveryCount = contracts.filter(c =>
    c.delivery_status && c.delivery_status !== 'livré'
  ).length;

  const kpis = [
    {
      label: "Contrats actifs",
      value: activeContracts.length,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-100",
    },
    {
      label: "Valeur mensuelle",
      value: formatCurrency(totalMonthly),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
    },
    {
      label: "En livraison",
      value: inDeliveryCount,
      icon: Clock,
      color: "text-orange-600",
      bg: inDeliveryCount > 0 ? "bg-orange-50 border-orange-100" : "bg-muted/40 border-border",
    },
    {
      label: "Expiration < 3 mois",
      value: expiringCount,
      icon: AlertTriangle,
      color: expiringCount > 0 ? "text-red-600" : "text-muted-foreground",
      bg: expiringCount > 0 ? "bg-red-50 border-red-100" : "bg-muted/40 border-border",
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (loadingError && filteredContracts.length === 0) {
    return (
      <div className="p-6 text-center py-12">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">{loadingError}</p>
        <Button onClick={fetchContracts} className="mt-4" size="sm">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">Contrats</h1>
          <span className="text-sm text-muted-foreground ml-1">
            ({filteredContracts.length})
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Inclure terminés */}
          <div className="flex items-center gap-2">
            <Switch
              id="include-completed"
              checked={includeCompleted}
              onCheckedChange={setIncludeCompleted}
              className="scale-90"
            />
            <Label htmlFor="include-completed" className="text-xs text-muted-foreground cursor-pointer">
              Inclure terminés
            </Label>
          </div>
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none h-8 px-3"
            >
              <List className="h-3.5 w-3.5 mr-1.5" /> Liste
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-none h-8 px-3 border-l"
            >
              <Grid className="h-3.5 w-3.5 mr-1.5" /> Kanban
            </Button>
          </div>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={cn("border rounded-xl p-3 flex items-center gap-3", kpi.bg)}>
              <div className={cn("p-1.5 rounded-lg bg-white/60", kpi.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className={cn("text-lg font-bold leading-tight", kpi.color)}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1 flex-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveStatusFilter(f.value)}
              className={cn(
                "h-7 px-3 text-xs rounded-full border transition-all",
                activeStatusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Advanced filters */}
      <ContractsAdvancedFilters
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        leasers={availableLeasers}
        durations={availableDurations}
      />

      {/* Content */}
      {filteredContracts.length === 0 ? (
        <ContractsEmptyState activeFilter={activeStatusFilter} />
      ) : viewMode === 'kanban' ? (
        <div className="overflow-x-auto">
          <ContractsKanban
            contracts={filteredContracts}
            onStatusChange={handleUpdateContractStatus}
            onAddTrackingInfo={handleAddTrackingInfo}
            isUpdatingStatus={isUpdatingStatus}
          />
        </div>
      ) : (
        <ContractsTable
          contracts={filteredContracts}
          onStatusChange={handleUpdateContractStatus}
          onAddTrackingInfo={handleAddTrackingInfo}
          onDeleteContract={handleDeleteContract}
          isUpdatingStatus={isUpdatingStatus}
          isDeleting={isDeleting}
        />
      )}

      {/* Footer total */}
      {filteredContracts.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Valeur mensuelle affichée :{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(filteredContracts.reduce((t, c) => t + (c.adjusted_monthly_payment || c.monthly_payment || 0), 0))}
          </span>
          {" · "}{filteredContracts.length} contrat{filteredContracts.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
};

export default Contracts;

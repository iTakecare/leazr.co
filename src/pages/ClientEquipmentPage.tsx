
import React from "react";
import { motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useEquipmentManagement } from '@/hooks/useEquipmentManagement';
import EquipmentTabs from '@/components/equipment/EquipmentTabs';
import EquipmentFilter from '@/components/equipment/EquipmentFilter';
import EquipmentList from '@/components/equipment/EquipmentList';
import EquipmentDetail from '@/components/equipment/EquipmentDetail';

// Component for displaying client equipment with assignment capabilities
const ClientEquipmentPage = () => {
  const {
    equipment,
    loading,
    error,
    selectedEquipmentId,
    selectedEquipment,
    searchQuery,
    activeTab,
    statusFilters,
    locationFilters,
    activeFiltersCount,
    setActiveTab,
    selectEquipment,
    saveEquipment,
    handleSearchChange,
    handleStatusFilterChange,
    handleLocationFilterChange,
    clearFilters
  } = useEquipmentManagement();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // Tabs configuration
  const tabs = [
    { id: 'vos-appareils', label: 'Vos appareils' },
    { id: 'votre-mdm', label: 'Votre MDM' },
    { id: 'pro', label: 'Pro' },
    { id: 'ajout', label: "Ajout d'appareils" },
    { id: 'rachat', label: 'Rachat de parc' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <h3 className="font-semibold">Erreur</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="h-full flex flex-col"
    >
      <div className="flex justify-between items-center mb-6 bg-muted/30 p-4 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Vos équipements
            <span className="text-sm bg-primary/10 text-primary rounded-full px-2 py-0.5">
              {equipment.length}
            </span>
          </h1>
          <p className="text-muted-foreground">
            Gérez vos équipements et leurs affectations
          </p>
        </div>
        <div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      <motion.div variants={itemVariants} className="flex-grow flex flex-col">
        <div className="mb-4">
          <EquipmentTabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          />
        </div>

        {activeTab === 'vos-appareils' && (
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <EquipmentFilter 
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                statusFilters={statusFilters}
                onStatusFilterChange={handleStatusFilterChange}
                locationFilters={locationFilters}
                onLocationFilterChange={handleLocationFilterChange}
                activeFiltersCount={activeFiltersCount}
                onClearFilters={clearFilters}
              />
              
              <EquipmentList 
                equipment={equipment}
                selectedEquipmentId={selectedEquipmentId}
                onSelectEquipment={selectEquipment}
              />
            </div>
            
            <div className="lg:col-span-2 border rounded-lg overflow-hidden">
              <EquipmentDetail 
                equipment={selectedEquipment} 
                onSave={saveEquipment}
              />
            </div>
          </div>
        )}

        {activeTab !== 'vos-appareils' && (
          <div className="flex-grow flex items-center justify-center bg-muted/20 rounded-md border-2 border-dashed border-muted">
            <div className="text-center">
              <p className="text-muted-foreground">Cette section sera bientôt disponible</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ClientEquipmentPage;

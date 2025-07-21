import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, History, Wrench, FileText, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Import des composants d'inventaire
import InventoryOverview from "./InventoryOverview";
import EquipmentTracking from "./EquipmentTracking";
import MaintenanceManagement from "./MaintenanceManagement";
import RequestManagement from "./RequestManagement";
import AlertsPanel from "./AlertsPanel";

const InventoryManagement: React.FC = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Gestion d'Inventaire
        </h2>
        <p className="text-muted-foreground">
          Suivez vos équipements, maintenances et mouvements en temps réel
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 w-full justify-start mobile-tabs-full">
          <TabsTrigger value="overview">
            <Package className={isMobile ? "" : "mr-2 h-4 w-4"} />
            {isMobile ? "Vue" : <span>Vue d'ensemble</span>}
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <History className={isMobile ? "" : "mr-2 h-4 w-4"} />
            {isMobile ? "Suivi" : <span>Suivi</span>}
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className={isMobile ? "" : "mr-2 h-4 w-4"} />
            {isMobile ? "Maintenance" : <span>Maintenance</span>}
          </TabsTrigger>
          <TabsTrigger value="requests">
            <FileText className={isMobile ? "" : "mr-2 h-4 w-4"} />
            {isMobile ? "Demandes" : <span>Demandes</span>}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className={isMobile ? "" : "mr-2 h-4 w-4"} />
            {isMobile ? "Alertes" : <span>Alertes</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <InventoryOverview />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <EquipmentTracking />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceManagement />
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <RequestManagement />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManagement;
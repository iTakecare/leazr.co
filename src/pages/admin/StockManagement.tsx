import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import StockDashboard from "@/components/stock/StockDashboard";
import StockItemList from "@/components/stock/StockItemList";
import StockMovementHistory from "@/components/stock/StockMovementHistory";
import StockRepairList from "@/components/stock/StockRepairList";
import StockItemForm from "@/components/stock/StockItemForm";

const StockManagement: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion du Stock</h1>
          <p className="text-muted-foreground text-sm">Suivi du cycle de vie des équipements physiques</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel article
        </Button>
      </div>

      <StockDashboard />

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">Articles</TabsTrigger>
          <TabsTrigger value="movements">Mouvements</TabsTrigger>
          <TabsTrigger value="repairs">Réparations</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-4">
          <StockItemList />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <StockMovementHistory />
        </TabsContent>
        <TabsContent value="repairs" className="mt-4">
          <StockRepairList />
        </TabsContent>
      </Tabs>

      <StockItemForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
};

export default StockManagement;

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Download, Upload } from "lucide-react";
import { ClientSelectionDialog } from "./ClientSelectionDialog";
import { ClientCustomPriceTable } from "./ClientCustomPriceTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";

export const ClientCatalogManager = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const { companyId } = useMultiTenant();

  // Récupérer les statistiques des catalogues personnalisés
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['client-catalog-stats', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, has_custom_catalog')
        .eq('company_id', companyId)
        .eq('has_custom_catalog', true);
      
      if (error) throw error;
      return {
        totalClientsWithCatalog: data?.length || 0,
        clientsWithCatalog: data || []
      };
    },
    enabled: !!companyId,
  });

  // Récupérer le client sélectionné
  const { data: selectedClient } = useQuery({
    queryKey: ['selected-client', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', selectedClientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients avec catalogue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalClientsWithCatalog || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              catalogues personnalisés actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowClientDialog(true)}
            >
              Gérer un client
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Client sélectionné */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedClient.name}
                  {selectedClient.has_custom_catalog && (
                    <Badge variant="secondary">Catalogue personnalisé</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedClient.company} • {selectedClient.email}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowClientDialog(true)}
              >
                Changer de client
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tableau des prix personnalisés */}
      {selectedClientId && (
        <ClientCustomPriceTable clientId={selectedClientId} />
      )}

      {/* Sélection du client */}
      <ClientSelectionDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        onClientSelected={(clientId) => {
          setSelectedClientId(clientId);
          setShowClientDialog(false);
        }}
      />
    </div>
  );
};
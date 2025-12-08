import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Settings, Download, Upload } from "lucide-react";
import { AmbassadorSelectionDialog } from "./AmbassadorSelectionDialog";
import { AmbassadorCustomPriceTable } from "./AmbassadorCustomPriceTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";

export const AmbassadorCatalogManager = () => {
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState<string | null>(null);
  const [showAmbassadorDialog, setShowAmbassadorDialog] = useState(false);
  const { companyId } = useMultiTenant();

  // Récupérer les statistiques des catalogues personnalisés ambassadeurs
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ambassador-catalog-stats', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ambassadors')
        .select('id, name, has_custom_catalog')
        .eq('company_id', companyId)
        .eq('has_custom_catalog', true);
      
      if (error) throw error;
      return {
        totalAmbassadorsWithCatalog: data?.length || 0,
        ambassadorsWithCatalog: data || []
      };
    },
    enabled: !!companyId,
  });

  // Récupérer l'ambassadeur sélectionné
  const { data: selectedAmbassador } = useQuery({
    queryKey: ['selected-ambassador', selectedAmbassadorId],
    queryFn: async () => {
      if (!selectedAmbassadorId) return null;
      
      const { data, error } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('id', selectedAmbassadorId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAmbassadorId,
  });

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ambassadeurs avec catalogue</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalAmbassadorsWithCatalog || 0}
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
              onClick={() => setShowAmbassadorDialog(true)}
            >
              Gérer un ambassadeur
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

      {/* Ambassadeur sélectionné */}
      {selectedAmbassador && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedAmbassador.name}
                  {selectedAmbassador.has_custom_catalog && (
                    <Badge variant="secondary">Catalogue personnalisé</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedAmbassador.company} • {selectedAmbassador.email}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAmbassadorDialog(true)}
              >
                Changer d'ambassadeur
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tableau des prix personnalisés */}
      {selectedAmbassadorId && (
        <AmbassadorCustomPriceTable ambassadorId={selectedAmbassadorId} />
      )}

      {/* Sélection de l'ambassadeur */}
      <AmbassadorSelectionDialog
        open={showAmbassadorDialog}
        onOpenChange={setShowAmbassadorDialog}
        onAmbassadorSelected={(ambassadorId) => {
          setSelectedAmbassadorId(ambassadorId);
          setShowAmbassadorDialog(false);
        }}
      />
    </div>
  );
};

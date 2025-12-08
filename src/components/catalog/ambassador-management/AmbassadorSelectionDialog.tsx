import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Building, Mail, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useToast } from "@/hooks/use-toast";

interface AmbassadorSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAmbassadorSelected: (ambassadorId: string) => void;
}

export const AmbassadorSelectionDialog: React.FC<AmbassadorSelectionDialogProps> = ({
  open,
  onOpenChange,
  onAmbassadorSelected,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { companyId } = useMultiTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer la liste des ambassadeurs
  const { data: ambassadors, isLoading } = useQuery({
    queryKey: ['ambassadors-for-catalog', companyId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('ambassadors')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Mutation pour activer/désactiver le catalogue personnalisé
  const toggleCatalogMutation = useMutation({
    mutationFn: async ({ ambassadorId, enabled }: { ambassadorId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('ambassadors')
        .update({ has_custom_catalog: enabled })
        .eq('id', ambassadorId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambassadors-for-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['ambassador-catalog-stats'] });
      toast({
        title: "Catalogue mis à jour",
        description: "La configuration du catalogue personnalisé a été mise à jour.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration.",
        variant: "destructive",
      });
    },
  });

  const handleToggleCatalog = (ambassadorId: string, currentValue: boolean) => {
    toggleCatalogMutation.mutate({
      ambassadorId,
      enabled: !currentValue,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gérer les catalogues ambassadeurs</DialogTitle>
          <DialogDescription>
            Sélectionnez un ambassadeur et activez son catalogue personnalisé
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un ambassadeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Liste des ambassadeurs */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des ambassadeurs...
              </div>
            ) : ambassadors?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun ambassadeur trouvé
              </div>
            ) : (
              ambassadors?.map((ambassador) => (
                <Card key={ambassador.id} className="cursor-pointer hover:bg-accent">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{ambassador.name}</h3>
                          {ambassador.has_custom_catalog && (
                            <Badge variant="secondary" className="text-xs">
                              Catalogue actif
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {ambassador.company && (
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              {ambassador.company}
                            </div>
                          )}
                          {ambassador.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {ambassador.email}
                            </div>
                          )}
                          {ambassador.region && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {ambassador.region}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Catalogue personnalisé</span>
                          <Switch
                            checked={ambassador.has_custom_catalog || false}
                            onCheckedChange={() => handleToggleCatalog(ambassador.id, ambassador.has_custom_catalog || false)}
                            disabled={toggleCatalogMutation.isPending}
                          />
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => onAmbassadorSelected(ambassador.id)}
                        >
                          Gérer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

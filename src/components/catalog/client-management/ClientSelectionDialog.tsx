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

interface ClientSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientSelected: (clientId: string) => void;
}

export const ClientSelectionDialog: React.FC<ClientSelectionDialogProps> = ({
  open,
  onOpenChange,
  onClientSelected,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { companyId } = useMultiTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer la liste des clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients-for-catalog', companyId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('clients')
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
    mutationFn: async ({ clientId, enabled }: { clientId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('clients')
        .update({ has_custom_catalog: enabled })
        .eq('id', clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-for-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['client-catalog-stats'] });
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

  const handleToggleCatalog = (clientId: string, currentValue: boolean) => {
    toggleCatalogMutation.mutate({
      clientId,
      enabled: !currentValue,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gérer les catalogues clients</DialogTitle>
          <DialogDescription>
            Sélectionnez un client et activez son catalogue personnalisé
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Liste des clients */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des clients...
              </div>
            ) : clients?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun client trouvé
              </div>
            ) : (
              clients?.map((client) => (
                <Card key={client.id} className="cursor-pointer hover:bg-accent">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{client.name}</h3>
                          {client.has_custom_catalog && (
                            <Badge variant="secondary" className="text-xs">
                              Catalogue actif
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {client.company && (
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              {client.company}
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>
                          )}
                          {client.city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {client.city}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Catalogue personnalisé</span>
                          <Switch
                            checked={client.has_custom_catalog || false}
                            onCheckedChange={() => handleToggleCatalog(client.id, client.has_custom_catalog || false)}
                            disabled={toggleCatalogMutation.isPending}
                          />
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => onClientSelected(client.id)}
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
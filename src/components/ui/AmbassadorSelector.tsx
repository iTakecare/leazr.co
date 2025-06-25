
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface AmbassadorSelectorAmbassador {
  id: string;
  name: string;
  email: string;
  commission_level?: {
    name: string;
  };
}

interface AmbassadorSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAmbassador: (ambassador: AmbassadorSelectorAmbassador) => void;
  selectedAmbassadorId?: string | null;
}

const AmbassadorSelector: React.FC<AmbassadorSelectorProps> = ({
  isOpen,
  onClose,
  onSelectAmbassador,
  selectedAmbassadorId
}) => {
  const [ambassadors, setAmbassadors] = useState<AmbassadorSelectorAmbassador[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchAmbassadors();
    }
  }, [isOpen]);

  const fetchAmbassadors = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching ambassadors...");
      
      // Requête simplifiée pour éviter les erreurs de JOIN
      const { data, error } = await supabase
        .from('ambassadors')
        .select(`
          id,
          name,
          email,
          commission_level_id
        `)
        .eq('status', 'active');

      if (error) {
        console.error("❌ Error fetching ambassadors:", error);
        throw error;
      }

      console.log("✅ Raw ambassador data:", data);

      // Si on a besoin des noms des niveaux de commission, on peut faire une requête séparée
      let commissionLevels = {};
      if (data && data.length > 0) {
        const levelIds = [...new Set(data.map(a => a.commission_level_id).filter(Boolean))];
        
        if (levelIds.length > 0) {
          const { data: levels } = await supabase
            .from('commission_levels')
            .select('id, name')
            .in('id', levelIds);
          
          if (levels) {
            commissionLevels = levels.reduce((acc, level) => {
              acc[level.id] = { name: level.name };
              return acc;
            }, {});
          }
        }
      }

      const formattedAmbassadors = data?.map(ambassador => ({
        id: ambassador.id,
        name: ambassador.name || 'Ambassadeur sans nom',
        email: ambassador.email || 'Email non défini',
        commission_level: ambassador.commission_level_id ? commissionLevels[ambassador.commission_level_id] : undefined
      })) || [];

      console.log("✅ Formatted ambassadors:", formattedAmbassadors);
      setAmbassadors(formattedAmbassadors);
    } catch (error) {
      console.error("❌ Error fetching ambassadors:", error);
      toast.error("Erreur lors du chargement des ambassadeurs");
      setAmbassadors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAmbassador = (ambassador: AmbassadorSelectorAmbassador) => {
    console.log("🎯 Selected ambassador:", ambassador);
    onSelectAmbassador(ambassador);
    onClose();
  };

  const filteredAmbassadors = ambassadors.filter(ambassador =>
    ambassador.name.toLowerCase().includes(search.toLowerCase()) ||
    ambassador.email.toLowerCase().includes(search.toLowerCase())
  );

  console.log("🔍 Filtered ambassadors:", filteredAmbassadors);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sélectionner un ambassadeur
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Command>
            <CommandInput
              placeholder="Rechercher un ambassadeur..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {ambassadors.length === 0 
                      ? "Aucun ambassadeur actif trouvé dans la base de données." 
                      : "Aucun ambassadeur ne correspond à votre recherche."
                    }
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredAmbassadors.map((ambassador) => (
                      <CommandItem
                        key={ambassador.id}
                        onSelect={() => handleSelectAmbassador(ambassador)}
                        className="flex items-center justify-between p-3 cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{ambassador.name}</span>
                            {selectedAmbassadorId === ambassador.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{ambassador.email}</div>
                          {ambassador.commission_level && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {ambassador.commission_level.name}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AmbassadorSelector;

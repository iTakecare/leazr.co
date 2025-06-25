
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
    commission_rate: number;
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
      
      const { data, error } = await supabase
        .from('ambassadors')
        .select(`
          id,
          profiles!inner(
            id,
            first_name,
            last_name,
            email
          ),
          commission_levels(
            name,
            commission_rate
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      const formattedAmbassadors = data?.map(ambassador => ({
        id: ambassador.id,
        name: `${ambassador.profiles.first_name} ${ambassador.profiles.last_name}`,
        email: ambassador.profiles.email,
        commission_level: ambassador.commission_levels
      })) || [];

      setAmbassadors(formattedAmbassadors);
    } catch (error) {
      console.error("Error fetching ambassadors:", error);
      toast.error("Erreur lors du chargement des ambassadeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAmbassador = (ambassador: AmbassadorSelectorAmbassador) => {
    onSelectAmbassador(ambassador);
    onClose();
  };

  const filteredAmbassadors = ambassadors.filter(ambassador =>
    ambassador.name.toLowerCase().includes(search.toLowerCase()) ||
    ambassador.email.toLowerCase().includes(search.toLowerCase())
  );

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
                  <CommandEmpty>Aucun ambassadeur trouvé.</CommandEmpty>
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
                              {ambassador.commission_level.name} - {ambassador.commission_level.commission_rate}%
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

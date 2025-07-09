
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { diagnoseAuthSession, fixAuthTransmission } from "@/utils/authDiagnostic";

export interface AmbassadorSelectorAmbassador {
  id: string;
  name: string;
  email: string;
  commission_level_id?: string; // Ajout direct du commission_level_id
  commission_level?: {
    id: string;
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
      
      // Vérifier l'authentification en premier
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("🔍 Session check:", { hasSession: !!session, sessionError });
      
      if (!session) {
        toast.error("Vous devez être connecté pour voir les ambassadeurs.");
        return;
      }
      
      // Récupérer le company_id de l'utilisateur connecté
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', session.user.id)
        .single();
      
      console.log("🔍 User profile:", { userProfile, profileError });
      
      if (profileError || !userProfile?.company_id) {
        toast.error("Impossible de récupérer vos informations d'entreprise.");
        return;
      }
      
      // Diagnostic complet de l'authentification
      const diagnostic = await diagnoseAuthSession();
      console.log("🔬 Diagnostic résultat:", diagnostic);
      
      // Requête pour récupérer les ambassadeurs avec filtrage côté client
      // comme sécurité supplémentaire puisque RLS ne fonctionne pas correctement
      const { data, error } = await supabase
        .from('ambassadors')
        .select(`
          id,
          name,
          email,
          commission_level_id,
          company_id
        `)
        .eq('status', 'active');

      if (error) {
        console.error("❌ Error fetching ambassadors:", error);
        throw error;
      }

      console.log("✅ Raw ambassador data:", data);
      console.log("🏢 User company_id:", userProfile.company_id);
      
      // FILTRAGE CÔTÉ CLIENT pour sécurité supplémentaire
      // Filtrer pour ne garder que les ambassadeurs de la même entreprise
      const filteredByCompany = data?.filter(ambassador => {
        const isOwn = ambassador.company_id === userProfile.company_id;
        console.log(`🔍 Ambassador ${ambassador.name}: company_id=${ambassador.company_id}, user_company=${userProfile.company_id}, match=${isOwn}`);
        return isOwn;
      }) || [];
      
      console.log("🏢 Ambassadors after company filter:", filteredByCompany.length);

      // Si on a besoin des noms des niveaux de commission, on peut faire une requête séparée
      let commissionLevels = {};
      if (filteredByCompany && filteredByCompany.length > 0) {
        const levelIds = [...new Set(filteredByCompany.map(a => a.commission_level_id).filter(Boolean))];
        
        if (levelIds.length > 0) {
          const { data: levels } = await supabase
            .from('commission_levels')
            .select('id, name')
            .in('id', levelIds);
          
          if (levels) {
            commissionLevels = levels.reduce((acc, level) => {
              acc[level.id] = { id: level.id, name: level.name };
              return acc;
            }, {});
          }
        }
      }

      const formattedAmbassadors = filteredByCompany?.map(ambassador => ({
        id: ambassador.id,
        name: ambassador.name || 'Ambassadeur sans nom',
        email: ambassador.email || 'Email non défini',
        commission_level_id: ambassador.commission_level_id, // Inclure directement l'ID
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

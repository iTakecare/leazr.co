import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDownIcon, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllClients } from "@/services/clientService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getAmbassadorClients } from "@/services/ambassador/ambassadorClients";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

// Define a specific type for the client in this component
export interface ClientSelectorClient {
  id: string;
  name: string;
  companyName: string;
  company?: string;
  email?: string;
  ambassador?: {
    id: string;
    name: string;
  };
}

interface ClientSelectorProps {
  selectedClientId?: string | null;
  onClientSelect?: (clientId: string | null) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectClient?: (client: ClientSelectorClient) => void;
  ambassadorMode?: boolean;
  selectedAmbassadorId?: string | null;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  selectedClientId, 
  onClientSelect,
  isOpen,
  onClose,
  onSelectClient,
  ambassadorMode = false,
  selectedAmbassadorId
}) => {
  const [clients, setClients] = useState<ClientSelectorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { user, isAmbassador } = useAuth();
  
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        
        let fetchedClients;
        
        // NOUVELLE LOGIQUE CORRIGÉE : Vérifier explicitement selectedAmbassadorId
        const shouldLoadAmbassadorClients = selectedAmbassadorId && selectedAmbassadorId !== undefined;
        const isCurrentUserAmbassador = isAmbassador();
        
        console.log("🔍 ClientSelector - Logique corrigée:", {
          selectedAmbassadorId,
          shouldLoadAmbassadorClients,
          isCurrentUserAmbassador,
          ambassadorMode,
          userId: user?.id
        });
        
        if (shouldLoadAmbassadorClients) {
          console.log("🔍 ClientSelector - Mode ambassadeur avec ID spécifique:", selectedAmbassadorId);
          
          // Charger les clients pour l'ambassadeur spécifique
          const { supabase } = await import("@/integrations/supabase/client");
          
          try {
            console.log("📊 ÉTAPE 1: Récupération des liens ambassador_clients pour ID:", selectedAmbassadorId);
            const { data: linkData, error: linkError } = await supabase
              .from('ambassador_clients')
              .select('client_id')
              .eq('ambassador_id', selectedAmbassadorId);

            console.log("🔍 Résultat liens ambassador_clients:", {
              data: linkData,
              error: linkError?.message,
              count: linkData?.length || 0,
              ambassadorId: selectedAmbassadorId
            });

            if (linkError) {
              console.error("❌ Erreur lors de la récupération des liens:", linkError);
              setClients([]);
              setLoading(false);
              return;
            }

            if (!linkData || linkData.length === 0) {
              console.log("⚠️ Aucun lien client-ambassadeur trouvé pour l'ambassadeur:", selectedAmbassadorId);
              setClients([]);
              setLoading(false);
              return;
            }

            const clientIds = linkData.map(link => link.client_id);
            console.log("📋 IDs des clients à récupérer:", clientIds);

            // Récupération des détails des clients
            console.log("📊 ÉTAPE 2: Récupération des détails des clients");
            const { data: clientsData, error: clientsError } = await supabase
              .from('clients')
              .select(`
                id,
                name,
                email,
                company
              `)
              .in('id', clientIds);

            console.log("🔍 Résultat détails clients:", {
              data: clientsData,
              error: clientsError?.message,
              count: clientsData?.length || 0
            });

            if (clientsError) {
              console.error("❌ Erreur lors de la récupération des clients:", clientsError);
              setClients([]);
              setLoading(false);
              return;
            }

            // Récupération des informations de l'ambassadeur
            console.log("📊 ÉTAPE 3: Récupération des informations ambassadeur");
            const { data: ambassadorData, error: ambassadorError } = await supabase
              .from('ambassadors')
              .select('id, name')
              .eq('id', selectedAmbassadorId)
              .single();

            console.log("🔍 Résultat ambassadeur:", {
              data: ambassadorData,
              error: ambassadorError?.message
            });

            // Formater les données
            fetchedClients = clientsData?.map(client => ({
              id: client.id,
              name: client.name,
              email: client.email || '',
              companyName: client.company || '',
              company: client.company,
              ambassador: ambassadorData ? {
                id: ambassadorData.id,
                name: ambassadorData.name
              } : {
                id: selectedAmbassadorId,
                name: 'Ambassadeur'
              }
            })) || [];
            
            console.log("✅ ClientSelector - Clients d'ambassadeur formatés:", fetchedClients);
            
          } catch (error) {
            console.error("❌ Erreur inattendue lors du chargement des clients d'ambassadeur:", error);
            setClients([]);
            setLoading(false);
            return;
          }
        } else if (isCurrentUserAmbassador) {
          console.log("🔍 ClientSelector - Utilisateur ambassadeur, chargement de SES clients");
          // L'utilisateur connecté est un ambassadeur, charger ses clients
          fetchedClients = await getAmbassadorClients();
          console.log("🔍 ClientSelector - Clients de l'utilisateur ambassadeur chargés:", fetchedClients);
        } else {
          console.log("🔍 ClientSelector - Mode TOUS les clients (offre interne ou admin)");
          // Mode offre interne ou admin - charger TOUS les clients
          fetchedClients = await getAllClients();
          console.log("🔍 ClientSelector - Tous les clients chargés:", fetchedClients);
        }
        
        if (!fetchedClients || fetchedClients.length === 0) {
          console.log("🔍 ClientSelector - Aucun client trouvé");
          setClients([]);
        } else {
          // Transform to ensure compatibility with ClientSelectorClient type
          const formattedClients = fetchedClients.map(client => ({
            id: client.id,
            name: client.name,
            companyName: client.company || client.companyName || '',
            company: client.company || client.companyName,
            email: client.email,
            ambassador: client.ambassador
          }));
          
          console.log("✅ ClientSelector - Clients formatés pour le sélecteur:", formattedClients);
          setClients(formattedClients);
        }
      } catch (error) {
        console.error("❌ ClientSelector - Erreur lors du chargement des clients:", error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadClients();
  }, [selectedAmbassadorId, isAmbassador, user?.id]); // Retirer ambassadorMode des dépendances car on se base sur selectedAmbassadorId
  
  const selectedClient = clients.find(client => client.id === selectedClientId);
  
  const handleSelect = (client: ClientSelectorClient) => {
    const newSelectedId = client.id === selectedClientId ? null : client.id;
    if (onClientSelect) {
      onClientSelect(newSelectedId);
    }
    
    if (onSelectClient && client.id !== selectedClientId) {
      onSelectClient(client);
    }
    
    setOpen(false);
    if (onClose) onClose();
  };
  
  // Modal mode for pages that need it
  if (isOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose ? onClose : () => {}}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {selectedAmbassadorId ? "Clients de l'ambassadeur" : "Sélectionner un client"}
            </h2>
          </div>
          
          {selectedAmbassadorId && !loading && clients.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p className="text-amber-800 text-sm">
                <User className="h-4 w-4 inline mr-2" />
                Aucun client n'est rattaché à cet ambassadeur.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <Command className="rounded-lg border shadow-md">
              <CommandInput placeholder="Rechercher un client..." />
              <CommandList>
                <CommandEmpty>
                  {loading ? "Chargement..." : "Aucun client trouvé."}
                </CommandEmpty>
                <CommandGroup>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    clients.length > 0 ? (
                      clients.map(client => (
                        <CommandItem
                          key={client.id}
                          onSelect={() => handleSelect(client)}
                          className="flex flex-col items-start cursor-pointer py-3"
                        >
                          <div className="flex justify-between w-full">
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{client.name}</span>
                                {client.ambassador && (
                                  <Badge variant="outline" className="text-xs">
                                    <User className="h-3 w-3 mr-1" />
                                    {client.ambassador.name}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{client.companyName}</span>
                              {client.email && (
                                <span className="text-xs text-muted-foreground">{client.email}</span>
                              )}
                            </div>
                            <CheckIcon
                              className={cn(
                                "ml-auto h-4 w-4 mt-1",
                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
                        </CommandItem>
                      ))
                    ) : (
                      <div className="py-6 text-center text-muted-foreground">
                        {selectedAmbassadorId ? 
                          "Cet ambassadeur n'a pas encore de clients rattachés." :
                          isAmbassador() ? 
                            "Aucun client trouvé pour cet ambassadeur." : 
                            "Aucun client trouvé."
                        }
                      </div>
                    )
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Default dropdown mode
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={selectedAmbassadorId && clients.length === 0 && !loading}
        >
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Chargement...
            </div>
          ) : selectedClient ? (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedClient.name}</span>
                {selectedClient.ambassador && (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {selectedClient.ambassador.name}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{selectedClient.companyName}</span>
            </div>
          ) : (
            selectedAmbassadorId && clients.length === 0 ? 
              "Aucun client pour cet ambassadeur" :
              "Sélectionner un client"
          )}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un client..." />
          <CommandList>
            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
            <CommandGroup>
              {clients.map(client => (
                <CommandItem
                  key={client.id}
                  onSelect={() => handleSelect(client)}
                >
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      <span>{client.name}</span>
                      {client.ambassador && (
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          {client.ambassador.name}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{client.companyName}</span>
                  </div>
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedClientId === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientSelector;

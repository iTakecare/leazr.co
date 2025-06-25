
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDownIcon, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllClients, getFreeClients } from "@/services/clientService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getClientsByAmbassadorId } from "@/services/ambassador/ambassadorClients";
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
        
        console.log("🔍 ClientSelector - État de la sélection:", {
          selectedAmbassadorId,
          ambassadorMode,
          isUserAmbassador: isAmbassador(),
          userId: user?.id
        });
        
        // NOUVELLE LOGIQUE CORRIGÉE : Prioriser le type d'offre plutôt que le profil utilisateur
        if (selectedAmbassadorId) {
          console.log("🎯 ClientSelector - Offre ambassadeur - Chargement des clients de l'ambassadeur:", selectedAmbassadorId);
          
          // Offre ambassadeur : charger les clients de l'ambassadeur sélectionné
          fetchedClients = await getClientsByAmbassadorId(selectedAmbassadorId);
          console.log("✅ ClientSelector - Clients d'ambassadeur chargés:", fetchedClients);
          
        } else {
          console.log("🎯 ClientSelector - Offre interne - Chargement des clients libres uniquement");
          
          // Offre interne : charger UNIQUEMENT les clients libres (non attachés aux ambassadeurs)
          fetchedClients = await getFreeClients();
          console.log("✅ ClientSelector - Clients libres chargés:", fetchedClients);
        }
        
        if (!fetchedClients || fetchedClients.length === 0) {
          console.log("⚠️ ClientSelector - Aucun client trouvé");
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
  }, [selectedAmbassadorId, user?.id]); // Supprimer isAmbassador de la dépendance car on privilégie selectedAmbassadorId
  
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
              {selectedAmbassadorId ? "Clients de l'ambassadeur" : "Sélectionner un client (Offre interne)"}
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
          
          {!selectedAmbassadorId && !loading && clients.length === 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-blue-800 text-sm">
                <User className="h-4 w-4 inline mr-2" />
                Tous les clients sont déjà rattachés à des ambassadeurs. Aucun client libre disponible pour les offres internes.
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
                                {!selectedAmbassadorId && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Client libre
                                  </Badge>
                                )}
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
                          "Aucun client libre disponible pour les offres internes."
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
          disabled={!loading && clients.length === 0}
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
                {!selectedAmbassadorId && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Libre
                  </Badge>
                )}
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
              !selectedAmbassadorId && clients.length === 0 ?
                "Aucun client libre disponible" :
                selectedAmbassadorId ? "Sélectionner un client ambassadeur" : "Sélectionner un client (interne)"
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
                      {!selectedAmbassadorId && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Libre
                        </Badge>
                      )}
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

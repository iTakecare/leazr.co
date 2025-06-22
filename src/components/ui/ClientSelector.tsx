
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllClients } from "@/services/clientService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getAmbassadorClients } from "@/services/ambassador/ambassadorClients";
import { useAuth } from "@/context/AuthContext";

// Define a specific type for the client in this component
export interface ClientSelectorClient {
  id: string;
  name: string;
  companyName: string;
  company?: string;
  email?: string;
}

interface ClientSelectorProps {
  selectedClientId?: string | null;
  onClientSelect?: (clientId: string | null) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectClient?: (client: ClientSelectorClient) => void;
  ambassadorMode?: boolean;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  selectedClientId, 
  onClientSelect,
  isOpen,
  onClose,
  onSelectClient,
  ambassadorMode = false
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
        
        // Force le mode ambassadeur si l'utilisateur est un ambassadeur
        const isAmbassadorMode = ambassadorMode || isAmbassador();
        
        if (isAmbassadorMode) {
          console.log("Mode ambassadeur activé - Chargement des clients ambassadeur uniquement");
          console.log("User ambassador_id:", user?.ambassador_id);
          console.log("User data:", user);
          
          // Charger UNIQUEMENT les clients de l'ambassadeur via la fonction sécurisée
          fetchedClients = await getAmbassadorClients();
          console.log("Clients ambassadeur chargés:", fetchedClients);
        } else {
          console.log("Mode admin - Chargement de tous les clients");
          // Sinon, charger tous les clients (mode admin)
          fetchedClients = await getAllClients();
        }
        
        if (!fetchedClients || fetchedClients.length === 0) {
          console.log("Aucun client trouvé");
          setClients([]);
          setLoading(false);
          return;
        }
        
        // Transform to ensure compatibility with ClientSelectorClient type
        const formattedClients = fetchedClients.map(client => ({
          id: client.id,
          name: client.name,
          companyName: client.company || '',
          company: client.company,
          email: client.email
        }));
        
        console.log("Clients formatés pour le sélecteur:", formattedClients);
        setClients(formattedClients);
      } catch (error) {
        console.error("Erreur lors du chargement des clients:", error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadClients();
  }, [ambassadorMode, isAmbassador, user?.ambassador_id]);
  
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
            <h2 className="text-lg font-semibold">Sélectionner un client</h2>
          </div>
          
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
                          className="flex flex-col items-start cursor-pointer py-2"
                        >
                          <div className="flex justify-between w-full">
                            <div className="flex flex-col">
                              <span className="font-medium">{client.name}</span>
                              <span className="text-xs text-muted-foreground">{client.companyName}</span>
                            </div>
                            <CheckIcon
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
                        </CommandItem>
                      ))
                    ) : (
                      <div className="py-6 text-center text-muted-foreground">
                        {ambassadorMode || isAmbassador() ? 
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
        >
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Chargement...
            </div>
          ) : selectedClient ? (
            <div className="flex flex-col items-start">
              <span className="font-medium">{selectedClient.name}</span>
              <span className="text-xs text-muted-foreground">{selectedClient.companyName}</span>
            </div>
          ) : (
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
                  <div className="flex flex-col">
                    <span>{client.name}</span>
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

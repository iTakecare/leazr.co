
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllClients } from "@/services/clientService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

// Define a specific type for the client in this component
interface ClientSelectorClient {
  id: string;
  name: string;
  companyName: string;
  company?: string;
  email?: string;
}

interface ClientSelectorProps {
  selectedClientId: string | null;
  onClientSelect: (clientId: string | null) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectClient?: (client: ClientSelectorClient) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  selectedClientId, 
  onClientSelect,
  isOpen,
  onClose,
  onSelectClient
}) => {
  const [clients, setClients] = useState<ClientSelectorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const fetchedClients = await getAllClients();
        
        // Transform to ensure compatibility with ClientSelectorClient type
        const formattedClients = fetchedClients.map(client => ({
          id: client.id,
          name: client.name,
          companyName: client.company || '',
          company: client.company,
          email: client.email
        }));
        
        setClients(formattedClients);
      } catch (error) {
        console.error("Failed to load clients", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadClients();
  }, []);
  
  const selectedClient = clients.find(client => client.id === selectedClientId);
  
  const handleSelect = (client: ClientSelectorClient) => {
    const newSelectedId = client.id === selectedClientId ? null : client.id;
    onClientSelect(newSelectedId);
    
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
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
            <Command className="rounded-lg border shadow-md">
              <CommandInput placeholder="Rechercher un client..." />
              <CommandList>
                <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                <CommandGroup>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
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

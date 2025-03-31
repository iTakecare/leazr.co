
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllClients } from "@/services/clientService";

interface Client {
  id: string;
  name: string;
  companyName: string;
}

interface ClientSelectorProps {
  selectedClientId: string | null;
  onClientSelect: (clientId: string | null) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ selectedClientId, onClientSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const fetchedClients = await getAllClients();
        setClients(fetchedClients);
      } catch (error) {
        console.error("Failed to load clients", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadClients();
  }, []);
  
  const selectedClient = clients.find(client => client.id === selectedClientId);
  
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
                  onSelect={() => {
                    onClientSelect(client.id === selectedClientId ? null : client.id);
                    setOpen(false);
                  }}
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

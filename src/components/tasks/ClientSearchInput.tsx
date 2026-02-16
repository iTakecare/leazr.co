import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Users, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface Client {
  id: string;
  name: string;
}

interface ClientSearchInputProps {
  value: string;
  onChange: (clientId: string, clientName?: string) => void;
}

const ClientSearchInput = ({ value, onChange }: ClientSearchInputProps) => {
  const { companyId } = useMultiTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !companyId) return;
    const fetchClients = async () => {
      setLoading(true);
      let query = supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')
        .limit(50);
      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }
      const { data } = await query;
      setClients(data || []);
      setLoading(false);
    };
    fetchClients();
  }, [companyId, search, isOpen]);

  // Resolve selected name on mount
  useEffect(() => {
    if (value && !selectedName) {
      supabase
        .from('clients')
        .select('name')
        .eq('id', value)
        .single()
        .then(({ data }) => {
          if (data) setSelectedName(data.name);
        });
    }
  }, [value]);

  const handleSelect = (client: Client) => {
    onChange(client.id, client.name);
    setSelectedName(client.name);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('', '');
    setSelectedName('');
    setSearch('');
  };

  return (
    <div>
      <Label>Client lié</Label>
      {value && selectedName ? (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-9 px-3 border rounded-md bg-muted flex items-center text-sm">
            {selectedName}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="flex justify-between items-center h-10 w-full px-3 py-2 mt-1"
        >
          <div className="flex items-center min-w-0 flex-1">
            <Users className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Sélectionner un client...</span>
          </div>
          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">•••</span>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sélectionner un client
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Command>
              <CommandInput
                placeholder="Rechercher un client..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="text-sm text-muted-foreground">Chargement...</span>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => { handleClear(); setIsOpen(false); }}
                        className="text-muted-foreground"
                      >
                        Aucun client
                      </CommandItem>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          onSelect={() => handleSelect(c)}
                          className="flex items-center justify-between p-3 cursor-pointer"
                        >
                          <span className="font-medium">{c.name}</span>
                          {value === c.id && <Check className="h-4 w-4 text-primary" />}
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
    </div>
  );
};

export default ClientSearchInput;

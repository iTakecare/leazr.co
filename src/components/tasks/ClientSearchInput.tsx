import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";
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
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId) return;
    const fetchClients = async () => {
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
    };
    fetchClients();
  }, [companyId, search]);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (client: Client) => {
    onChange(client.id, client.name);
    setSelectedName(client.name);
    setSearch('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange('', '');
    setSelectedName('');
    setSearch('');
  };

  if (value && selectedName) {
    return (
      <div>
        <Label>Client lié</Label>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-9 px-3 border rounded-md bg-muted flex items-center text-sm">
            {selectedName}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Label>Client lié</Label>
      <div className="relative mt-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client..."
          className="pl-8"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-border">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
            Sélectionner un client
          </div>
          <button
            type="button"
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
            onClick={() => { handleClear(); setShowDropdown(false); }}
          >
            Aucun client
          </button>
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelect(c)}
            >
              {c.name}
            </button>
          ))}
          {clients.length === 0 && search && (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">Aucun résultat</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientSearchInput;

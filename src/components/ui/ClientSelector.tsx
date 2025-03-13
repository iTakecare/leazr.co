
import React, { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Building2, Mail } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
}

interface ClientSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: Client) => void;
}

const mockClients: Client[] = [
  { id: "1", name: "Jean Dupont", email: "jean.dupont@example.com", company: "Dupont SA" },
  { id: "2", name: "Marie Martin", email: "marie.martin@example.com", company: "Martin & Co" },
  { id: "3", name: "Pierre Lefevre", email: "pierre.lefevre@example.com", company: "Lefevre Tech" },
  { id: "4", name: "Sophie Bernard", email: "sophie.bernard@example.com", company: "Bernard Solutions" },
  { id: "5", name: "Thomas Moreau", email: "thomas.moreau@example.com", company: "Moreau Consulting" },
];

const ClientSelector = ({ isOpen, onClose, onSelectClient }: ClientSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>(mockClients);
  
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSelectClient = (client: Client) => {
    onSelectClient(client);
    onClose();
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sélection du client</SheetTitle>
          <SheetDescription>
            Choisissez un client pour votre offre
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="space-y-2">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="border rounded-lg p-4 cursor-pointer hover:border-primary"
                onClick={() => handleSelectClient(client)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium">{client.name}</h3>
                </div>
                <div className="space-y-1 pl-8">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{client.company}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Aucun client trouvé</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClientSelector;

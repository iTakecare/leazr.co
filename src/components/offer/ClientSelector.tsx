
import React from 'react';
import { Button } from "@/components/ui/button";
import { Client } from '@/types/client';

interface ClientSelectorProps {
  selectedClient: Client | null;
  onSelect: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  clients?: Client[];
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  selectedClient, 
  onSelect,
  isOpen,
  onClose,
  clients
}) => {
  // If this is the button component (no isOpen prop provided)
  if (isOpen === undefined) {
    return (
      <Button 
        onClick={onSelect} 
        variant="outline" 
        className="flex-1 justify-start text-left font-normal"
      >
        <span className="truncate">
          {selectedClient ? selectedClient.name : "Sélectionner un client"}
        </span>
      </Button>
    );
  }
  
  // If this is the dialog component
  const handleClientSelect = (client: Client) => {
    if (onSelect && typeof onSelect === 'function') {
      // @ts-ignore - We know this will be called with a client in this context
      onSelect(client);
    }
    if (onClose) onClose();
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
      <div className="bg-white rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sélectionner un client</h2>
          <button onClick={onClose} className="text-gray-500">&times;</button>
        </div>
        
        <div className="space-y-2">
          {clients && clients.length > 0 ? (
            clients.map(client => (
              <div
                key={client.id}
                className={`p-3 border rounded-md cursor-pointer hover:bg-muted transition-colors ${
                  selectedClient?.id === client.id ? 'border-primary bg-primary/10' : ''
                }`}
                onClick={() => handleClientSelect(client)}
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-muted-foreground">
                  {client.email || 'No email'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun client disponible
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientSelector;

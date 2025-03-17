
import React from 'react';
import { Button } from "@/components/ui/button";
import { Client } from '@/types/client';

// Interface for the button component
interface ClientSelectorButtonProps {
  selectedClient: Client | null;
  onSelect: () => void;
}

// Button component
const ClientSelectorButton: React.FC<ClientSelectorButtonProps> = ({ 
  selectedClient, 
  onSelect 
}) => {
  return (
    <Button 
      onClick={onSelect} 
      variant="outline" 
      className="flex-1 justify-start text-left font-normal"
    >
      <span className="truncate">
        {selectedClient ? `${selectedClient.name}${selectedClient.company ? ` - ${selectedClient.company}` : ''}` : "Sélectionner un client"}
      </span>
    </Button>
  );
};

export default ClientSelectorButton;

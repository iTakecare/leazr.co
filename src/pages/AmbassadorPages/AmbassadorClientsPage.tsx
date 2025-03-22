
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAmbassadorClients } from "@/hooks/useAmbassadorClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Mail, Phone, PlusCircle, Pencil } from "lucide-react";
import { Client } from "@/types/client";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

const AmbassadorClientsPage = () => {
  const navigate = useNavigate();
  const { clients, isLoading, error, loadClients } = useAmbassadorClients();
  const [searchTerm, setSearchTerm] = useState("");
  
  useEffect(() => {
    document.title = "Mes Clients | Ambassadeur iTakecare";
  }, []);
  
  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(searchLower) ||
      client.company?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });
  
  const handleCreateClient = () => {
    navigate("/ambassador/clients/create");
  };
  
  const handleEditClient = (clientId: string) => {
    navigate(`/ambassador/clients/edit/${clientId}`);
  };
  
  const handleSelectClient = (clientId: string) => {
    navigate(`/ambassador/create-offer/${clientId}`);
  };
  
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Mes Clients</h1>
            <Button onClick={handleCreateClient} className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau client
            </Button>
          </div>
          
          <div className="mb-6">
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-500">Chargement des clients...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => loadClients()} 
                className="mt-4"
              >
                Réessayer
              </Button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-gray-50">
              {searchTerm ? (
                <p className="text-gray-500">Aucun client trouvé pour cette recherche</p>
              ) : (
                <>
                  <p className="text-gray-500">Vous n'avez pas encore de clients</p>
                  <Button 
                    onClick={handleCreateClient} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter un client
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <ClientCard 
                  key={client.id} 
                  client={client} 
                  onSelect={handleSelectClient}
                  onEdit={handleEditClient}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </PageTransition>
  );
};

interface ClientCardProps {
  client: Client;
  onSelect: (clientId: string) => void;
  onEdit: (clientId: string) => void;
}

const ClientCard = ({ client, onSelect, onEdit }: ClientCardProps) => {
  return (
    <Card className="overflow-hidden transition-colors hover:border-primary cursor-pointer">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-lg truncate">{client.name}</h3>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-500 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(client.id);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-4 space-y-2 text-sm text-gray-500">
          {client.company && (
            <div className="flex items-center">
              <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{client.company}</span>
            </div>
          )}
          
          {client.email && (
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          
          {client.phone && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>
        
        <Button 
          variant="outline" 
          className="mt-4 w-full"
          onClick={() => onSelect(client.id)}
        >
          Créer une offre
        </Button>
      </CardContent>
    </Card>
  );
};

export default AmbassadorClientsPage;

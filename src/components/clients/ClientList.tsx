
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Edit, Trash2, Building2, Mail, Phone, MapPin, MoreHorizontal, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDateToFrench } from "@/utils/formatters";
import { Client } from "@/types/client";
import { forceRefreshCRMCache } from "@/utils/crmCacheUtils";

interface ClientListProps {
  clients: Client[];
  onDeleteClient: (id: string) => void;
  onEditClient: (id: string) => void;
  onViewClient: (id: string) => void;
  onForceRefresh?: () => void;
}

const ClientList: React.FC<ClientListProps> = ({
  clients,
  onDeleteClient,
  onEditClient,
  onViewClient,
  onForceRefresh,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const handleViewClient = (client: Client) => {
    console.log("Viewing client:", client);
    if (client.id) {
      console.log("Navigating to client detail:", `/clients/${client.id}`);
      navigate(`/clients/${client.id}`);
      onViewClient(client.id);
    } else {
      console.error("Client ID is missing:", client);
    }
  };

  const handleEditClient = (client: Client) => {
    console.log("Editing client:", client);
    if (client.id) {
      console.log("Navigating to client edit:", `/clients/edit/${client.id}`);
      navigate(`/clients/edit/${client.id}`);
      onEditClient(client.id);
    } else {
      console.error("Client ID is missing:", client);
    }
  };

  const handleDeleteClient = (client: Client) => {
    if (client.id && window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      onDeleteClient(client.id);
    }
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client trouvé</h3>
        <p className="text-gray-500 mb-6">
          Aucun client trouvé pour votre entreprise. Commencez par ajouter votre premier client.
        </p>
        <div className="space-x-2">
          <Button onClick={() => navigate('/clients/new')}>
            Ajouter un client
          </Button>
          {onForceRefresh && (
            <Button variant="outline" onClick={onForceRefresh}>
              Actualiser le cache
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{client.name}</h3>
                  {client.company && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Building2 className="w-4 h-4 mr-1" />
                      {client.company}
                    </div>
                  )}
                </div>
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                  {client.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              
              <div className="space-y-2 mb-4">
                {client.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {client.phone}
                  </div>
                )}
                {(client.city || client.country) && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {[client.city, client.country].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Créé le {formatDateToFrench(new Date(client.created_at))}
                </span>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewClient(client)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditClient(client)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteClient(client)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Société</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date de création</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="font-medium">{client.name}</div>
                {client.contact_name && client.contact_name !== client.name && (
                  <div className="text-sm text-gray-500">Contact: {client.contact_name}</div>
                )}
              </TableCell>
              <TableCell>
                {client.company ? (
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    {client.company}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {client.email ? (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {client.email}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {client.phone ? (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {client.phone}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={client.status === 'active' ? 'default' : 'secondary'}
                  className={
                    client.status === 'active' 
                      ? "bg-green-100 text-green-800 hover:bg-green-100" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }
                >
                  {client.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDateToFrench(new Date(client.created_at))}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewClient(client)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditClient(client)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClient(client)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientList;

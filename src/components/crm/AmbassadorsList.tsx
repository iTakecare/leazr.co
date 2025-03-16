
import React, { useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, MoreHorizontal, Mail, Phone, AlertCircle, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AmbassadorsListProps {
  searchTerm?: string;
  statusFilter?: string;
}

const AmbassadorsList: React.FC<AmbassadorsListProps> = ({ searchTerm = '', statusFilter = 'all' }) => {
  // Dummy data for ambassadors - replace with actual data fetching logic
  const ambassadors = [
    {
      id: '1',
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      phone: '0123456789',
      status: 'active',
      clientsCount: 12,
      zone: 'Paris',
      commissions: 1250
    },
    {
      id: '2',
      name: 'Marie Durand',
      email: 'marie.durand@example.com',
      phone: '0123456789',
      status: 'inactive',
      clientsCount: 5,
      zone: 'Lyon',
      commissions: 450
    }
  ];

  // Filter ambassadors based on search term and status filter
  const filteredAmbassadors = ambassadors.filter(ambassador => {
    const matchesSearch = 
      ambassador.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ambassador.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ambassador.zone.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ambassador.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (ambassadors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground">Aucun ambassadeur trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Clients</TableHead>
            <TableHead>Commissions</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAmbassadors.length > 0 ? (
            filteredAmbassadors.map((ambassador) => (
              <TableRow key={ambassador.id}>
                <TableCell className="font-medium">{ambassador.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 mr-1" />
                      {ambassador.email}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 mr-1" />
                      {ambassador.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{ambassador.zone}</TableCell>
                <TableCell>{ambassador.clientsCount} clients</TableCell>
                <TableCell>{ambassador.commissions} €</TableCell>
                <TableCell>
                  <Badge variant={ambassador.status === 'active' ? 'default' : 'secondary'} className={
                    ambassador.status === 'active' 
                      ? "bg-green-100 text-green-800 hover:bg-green-100" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }>
                    {ambassador.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Afficher le profil</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem>Voir les clients</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className={ambassador.status === 'active' ? "text-amber-600" : "text-green-600"}>
                        {ambassador.status === 'active' ? 'Désactiver' : 'Activer'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mb-2 text-gray-300" />
                  <p>Aucun ambassadeur trouvé</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AmbassadorsList;

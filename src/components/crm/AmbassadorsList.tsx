
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, MoreHorizontal, Mail, Phone, ReceiptEuro } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/formatters";

// Ceci est une liste statique pour le moment, elle pourrait être remplacée par des données réelles plus tard
const ambassadors = [
  {
    id: '1',
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    region: 'Île-de-France',
    clientsCount: 12,
    commissionsTotal: 8750,
    lastCommission: 1250,
    status: 'active'
  },
  {
    id: '2',
    name: 'Marie Martin',
    email: 'marie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    region: 'Auvergne-Rhône-Alpes',
    clientsCount: 8,
    commissionsTotal: 5320,
    lastCommission: 980,
    status: 'active'
  },
  {
    id: '3',
    name: 'Pierre Bernard',
    email: 'pierre.bernard@example.com',
    phone: '+33 6 34 56 78 90',
    region: 'Nouvelle-Aquitaine',
    clientsCount: 5,
    commissionsTotal: 3150,
    lastCommission: 0,
    status: 'inactive'
  }
];

const AmbassadorsList = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2">
          <HeartHandshake className="h-4 w-4" />
          Ajouter un ambassadeur
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Région</TableHead>
            <TableHead>Clients</TableHead>
            <TableHead>Commissions</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ambassadors.map((ambassador) => (
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
              <TableCell>{ambassador.region}</TableCell>
              <TableCell>{ambassador.clientsCount} clients</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <div className="font-medium text-sm">
                    {formatCurrency(ambassador.commissionsTotal)}
                  </div>
                  {ambassador.lastCommission > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <ReceiptEuro className="h-3 w-3 mr-1" />
                      Dernière: {formatCurrency(ambassador.lastCommission)}
                    </div>
                  )}
                </div>
              </TableCell>
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
                    <DropdownMenuItem>Voir les commissions</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Désactiver</DropdownMenuItem>
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

export default AmbassadorsList;

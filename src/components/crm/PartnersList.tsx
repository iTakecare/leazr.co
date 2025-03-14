
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgePercent, MoreHorizontal, Building2, Mail, Phone } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Ceci est une liste statique pour le moment, elle pourrait être remplacée par des données réelles plus tard
const partners = [
  {
    id: '1',
    name: 'TechSolutions SAS',
    contactName: 'Alexandre Martin',
    email: 'contact@techsolutions.com',
    phone: '+33 1 23 45 67 89',
    type: 'Revendeur',
    commissionsTotal: '12 500 €',
    status: 'active'
  },
  {
    id: '2',
    name: 'Digital Partners',
    contactName: 'Sophie Dubois',
    email: 'info@digitalpartners.com',
    phone: '+33 1 34 56 78 90',
    type: 'Intégrateur',
    commissionsTotal: '8 750 €',
    status: 'active'
  },
  {
    id: '3',
    name: 'Innov IT',
    contactName: 'Thomas Petit',
    email: 'contact@innovit.fr',
    phone: '+33 1 45 67 89 01',
    type: 'Consultant',
    commissionsTotal: '5 300 €',
    status: 'inactive'
  }
];

const PartnersList = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2">
          <BadgePercent className="h-4 w-4" />
          Ajouter un partenaire
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Société</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Commissions</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((partner) => (
            <TableRow key={partner.id}>
              <TableCell>
                <div className="font-medium">{partner.name}</div>
                <div className="text-xs text-muted-foreground">{partner.contactName}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 mr-1" />
                    {partner.email}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 mr-1" />
                    {partner.phone}
                  </div>
                </div>
              </TableCell>
              <TableCell>{partner.type}</TableCell>
              <TableCell>{partner.commissionsTotal}</TableCell>
              <TableCell>
                <Badge variant={partner.status === 'active' ? 'default' : 'secondary'} className={
                  partner.status === 'active' 
                    ? "bg-green-100 text-green-800 hover:bg-green-100" 
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                }>
                  {partner.status === 'active' ? 'Actif' : 'Inactif'}
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
                    <DropdownMenuItem>Voir les offres</DropdownMenuItem>
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

export default PartnersList;

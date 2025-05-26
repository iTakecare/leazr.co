
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Ticket, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  company_name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  category: string;
}

const LeazrSupportTickets = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Mock data - à remplacer par de vraies données de la base
  const mockTickets: SupportTicket[] = [
    {
      id: "1",
      title: "Problème de connexion à l'API",
      description: "Impossible de se connecter à l'API depuis ce matin",
      status: "open",
      priority: "high",
      company_name: "TechLeasing Pro",
      company_id: "comp-1",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      category: "Technique"
    },
    {
      id: "2",
      title: "Question sur la facturation",
      description: "Demande d'information sur le changement de plan",
      status: "in_progress",
      priority: "medium",
      company_name: "Leasing Solutions",
      company_id: "comp-2",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      assigned_to: "Support Team",
      category: "Facturation"
    },
    {
      id: "3",
      title: "Demande de formation",
      description: "Formation pour les nouveaux utilisateurs",
      status: "resolved",
      priority: "low",
      company_name: "Fleet Manager Corp",
      company_id: "comp-3",
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      category: "Formation"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Ouvert</Badge>;
      case 'in_progress':
        return <Badge variant="default">En cours</Badge>;
      case 'resolved':
        return <Badge variant="secondary">Résolu</Badge>;
      case 'closed':
        return <Badge variant="outline">Fermé</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">Haute</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Moyenne</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Basse</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Ticket className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTickets = mockTickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: mockTickets.length,
    open: mockTickets.filter(t => t.status === 'open').length,
    inProgress: mockTickets.filter(t => t.status === 'in_progress').length,
    resolved: mockTickets.filter(t => t.status === 'resolved').length,
    urgent: mockTickets.filter(t => t.priority === 'urgent').length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total</div>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="text-sm font-medium">Ouverts</div>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div className="text-sm font-medium">En cours</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="text-sm font-medium">Résolus</div>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm font-medium">Urgents</div>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">Tous les statuts</option>
            <option value="open">Ouverts</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolus</option>
            <option value="closed">Fermés</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">Toutes priorités</option>
            <option value="urgent">Urgent</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau ticket
        </Button>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets de Support</CardTitle>
          <CardDescription>
            Gérez tous les tickets de support de vos clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead>Créé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(ticket.status)}
                      <div>
                        <div className="font-medium">{ticket.title}</div>
                        <div className="text-sm text-muted-foreground">
                          #{ticket.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {ticket.company_name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{ticket.company_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(ticket.status)}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(ticket.priority)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ticket.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.assigned_to || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(ticket.created_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Répondre
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredTickets.length === 0 && (
        <div className="text-center py-8">
          <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">Aucun ticket trouvé</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucun ticket ne correspond à vos critères de recherche.
          </p>
        </div>
      )}
    </div>
  );
};

export default LeazrSupportTickets;

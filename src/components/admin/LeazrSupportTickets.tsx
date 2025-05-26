
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Ticket, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Search,
  Filter
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SupportTicket {
  id: string;
  company_name: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

const LeazrSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    // For now, we'll use mock data since the support tickets table might not exist yet
    const mockTickets: SupportTicket[] = [
      {
        id: '1',
        company_name: 'TechCorp Solutions',
        subject: 'Problème de synchronisation des données',
        status: 'open',
        priority: 'high',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        company_name: 'LeaseMax Pro',
        subject: 'Demande de formation utilisateur',
        status: 'in_progress',
        priority: 'medium',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: 'Support Team'
      },
      {
        id: '3',
        company_name: 'FinLease Partners',
        subject: 'Bug dans le module de calcul',
        status: 'resolved',
        priority: 'urgent',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: 'Dev Team'
      }
    ];
    
    setTickets(mockTickets);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Ouvert</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">En cours</Badge>;
      case 'resolved':
        return <Badge variant="default">Résolu</Badge>;
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
        return <Badge className="bg-orange-100 text-orange-800">Élevé</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Moyen</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Faible</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Clock className="h-4 w-4 text-yellow-500" />
              <div className="text-sm font-medium">En cours</div>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
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
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par entreprise ou sujet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
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
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets de Support</CardTitle>
          <CardDescription>
            Gérez les demandes de support de vos clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead>Créé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    {ticket.company_name}
                  </TableCell>
                  <TableCell>
                    {ticket.subject}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(ticket.status)}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(ticket.priority)}
                  </TableCell>
                  <TableCell>
                    {ticket.assigned_to || 'Non assigné'}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(ticket.created_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTickets.length === 0 && (
            <div className="text-center py-8">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Aucun ticket trouvé</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Aucun ticket ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeazrSupportTickets;

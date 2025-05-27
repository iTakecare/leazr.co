
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  MoreHorizontal,
  Reply,
  Archive,
  Flag,
  User
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'feature_request' | 'bug' | 'general';
  customerName: string;
  customerEmail: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  responseTime?: number; // en heures
  messages: {
    id: string;
    sender: 'customer' | 'support';
    message: string;
    timestamp: string;
    attachments?: string[];
  }[];
}

const SaaSSupportManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  // Données de démonstration
  const [tickets] = useState<SupportTicket[]>([
    {
      id: '1',
      title: 'Problème de connexion à l\'API',
      description: 'Impossible de se connecter à l\'API depuis ce matin, erreur 500',
      status: 'open',
      priority: 'high',
      category: 'technical',
      customerName: 'Jean Dupont',
      customerEmail: 'jean@techcorp.com',
      companyName: 'TechCorp Solutions',
      createdAt: '2024-05-27T08:30:00Z',
      updatedAt: '2024-05-27T08:30:00Z',
      responseTime: 2,
      messages: [
        {
          id: '1',
          sender: 'customer',
          message: 'Bonjour, nous rencontrons un problème avec l\'API depuis ce matin. Pouvez-vous nous aider ?',
          timestamp: '2024-05-27T08:30:00Z'
        }
      ]
    },
    {
      id: '2',
      title: 'Demande de fonctionnalité - Export Excel',
      description: 'Souhait d\'ajouter une fonction d\'export Excel pour les rapports',
      status: 'in_progress',
      priority: 'medium',
      category: 'feature_request',
      customerName: 'Marie Martin',
      customerEmail: 'marie@startupx.fr',
      companyName: 'StartupX',
      createdAt: '2024-05-26T14:15:00Z',
      updatedAt: '2024-05-27T09:20:00Z',
      assignedTo: 'Support Technique',
      responseTime: 4,
      messages: [
        {
          id: '1',
          sender: 'customer',
          message: 'Serait-il possible d\'ajouter une fonction d\'export Excel ?',
          timestamp: '2024-05-26T14:15:00Z'
        },
        {
          id: '2',
          sender: 'support',
          message: 'Merci pour votre suggestion. Nous étudions cette fonctionnalité.',
          timestamp: '2024-05-27T09:20:00Z'
        }
      ]
    },
    {
      id: '3',
      title: 'Problème de facturation',
      description: 'Question sur la facturation du mois dernier',
      status: 'waiting_response',
      priority: 'medium',
      category: 'billing',
      customerName: 'Pierre Leroy',
      customerEmail: 'pierre@enterprise.com',
      companyName: 'Enterprise Ltd',
      createdAt: '2024-05-25T16:45:00Z',
      updatedAt: '2024-05-26T10:30:00Z',
      assignedTo: 'Support Facturation',
      responseTime: 18,
      messages: [
        {
          id: '1',
          sender: 'customer',
          message: 'J\'ai une question concernant ma facture du mois dernier.',
          timestamp: '2024-05-25T16:45:00Z'
        },
        {
          id: '2',
          sender: 'support',
          message: 'Nous avons vérifié votre compte. Pouvez-vous préciser votre question ?',
          timestamp: '2024-05-26T10:30:00Z'
        }
      ]
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'waiting_response':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'closed':
        return <Archive className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-red-100 text-red-800',
      in_progress: 'bg-orange-100 text-orange-800',
      waiting_response: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      open: 'Ouvert',
      in_progress: 'En cours',
      waiting_response: 'En attente',
      resolved: 'Résolu',
      closed: 'Fermé'
    };
    return { 
      color: colors[status as keyof typeof colors], 
      label: labels[status as keyof typeof labels] 
    };
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    const labels = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Haute',
      urgent: 'Urgente'
    };
    return { 
      color: colors[priority as keyof typeof colors], 
      label: labels[priority as keyof typeof labels] 
    };
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      technical: 'Technique',
      billing: 'Facturation',
      feature_request: 'Fonctionnalité',
      bug: 'Bug',
      general: 'Général'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const avgResponseTime = tickets.reduce((sum, t) => sum + (t.responseTime || 0), 0) / tickets.length;

  return (
    <div className="space-y-6">
      {/* Métriques en haut */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets ouverts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent une attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTickets}</div>
            <p className="text-xs text-muted-foreground">
              Tickets en traitement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps de réponse</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgResponseTime)}h</div>
            <p className="text-xs text-muted-foreground">
              Temps moyen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8/5</div>
            <p className="text-xs text-muted-foreground">
              Note moyenne
            </p>
          </CardContent>
        </Card>
      </div>

      {/* En-tête avec actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Support Client</h2>
          <p className="text-muted-foreground">Gestion des tickets de support</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre, client ou entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="open">Ouvert</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="waiting_response">En attente</SelectItem>
                <SelectItem value="resolved">Résolu</SelectItem>
                <SelectItem value="closed">Fermé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets de support ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => {
                const statusInfo = getStatusBadge(ticket.status);
                const priorityInfo = getPriorityBadge(ticket.priority);
                return (
                  <TableRow 
                    key={ticket.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setIsTicketDialogOpen(true);
                    }}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.title}</div>
                        <div className="text-sm text-muted-foreground">
                          #{ticket.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {ticket.companyName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(ticket.status)}
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityInfo.color}>
                        {priorityInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getCategoryLabel(ticket.category)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {ticket.assignedTo ? (
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span className="text-sm">{ticket.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Non assigné</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Reply className="h-4 w-4 mr-2" />
                            Répondre
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Flag className="h-4 w-4 mr-2" />
                            Assigner
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="h-4 w-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de détail du ticket */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedTicket.title}</span>
                  <Badge className={getStatusBadge(selectedTicket.status).color}>
                    {getStatusBadge(selectedTicket.status).label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Ticket #{selectedTicket.id} • {selectedTicket.companyName} • {getCategoryLabel(selectedTicket.category)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Informations du ticket */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Client</Label>
                    <p className="text-sm">{selectedTicket.customerName}</p>
                    <p className="text-sm text-muted-foreground">{selectedTicket.customerEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priorité</Label>
                    <div className="mt-1">
                      <Badge className={getPriorityBadge(selectedTicket.priority).color}>
                        {getPriorityBadge(selectedTicket.priority).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Conversation</Label>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedTicket.messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`p-3 rounded-lg ${
                          message.sender === 'customer' 
                            ? 'bg-blue-50 ml-8' 
                            : 'bg-green-50 mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            {message.sender === 'customer' ? selectedTicket.customerName : 'Support'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Réponse */}
                <div className="space-y-3">
                  <Label htmlFor="response">Répondre au ticket</Label>
                  <Textarea 
                    id="response"
                    placeholder="Tapez votre réponse ici..."
                    rows={4}
                  />
                  <div className="flex justify-between">
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Changer le statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="waiting_response">En attente</SelectItem>
                        <SelectItem value="resolved">Résolu</SelectItem>
                        <SelectItem value="closed">Fermé</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button>
                      <Reply className="h-4 w-4 mr-2" />
                      Envoyer la réponse
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaaSSupportManager;

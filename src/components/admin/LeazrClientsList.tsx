
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  Users, 
  Calendar, 
  CreditCard,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface LeazrClient {
  id: string;
  name: string;
  logo_url?: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  trial_ends_at?: string;
  subscription_ends_at?: string;
  users_count?: number;
  modules_enabled?: string[];
}

interface LeazrClientsListProps {
  searchTerm: string;
  statusFilter: string;
  onClientSelect: (clientId: string) => void;
}

const LeazrClientsList: React.FC<LeazrClientsListProps> = ({
  searchTerm,
  statusFilter,
  onClientSelect
}) => {
  const [clients, setClients] = useState<LeazrClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          logo_url,
          plan,
          is_active,
          created_at,
          trial_ends_at,
          subscription_ends_at,
          modules_enabled
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des clients:', error);
        toast.error('Erreur lors du chargement des clients');
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (client: LeazrClient) => {
    if (!client.is_active) {
      return <Badge variant="destructive">Inactif</Badge>;
    }
    
    if (client.trial_ends_at && new Date(client.trial_ends_at) > new Date()) {
      return <Badge variant="outline">Essai</Badge>;
    }
    
    if (client.subscription_ends_at && new Date(client.subscription_ends_at) < new Date()) {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    
    return <Badge variant="default">Actif</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const planColors = {
      starter: "bg-blue-100 text-blue-800",
      pro: "bg-purple-100 text-purple-800",
      business: "bg-green-100 text-green-800"
    };
    
    return (
      <Badge className={planColors[plan as keyof typeof planColors] || "bg-gray-100 text-gray-800"}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = client.is_active && (!client.subscription_ends_at || new Date(client.subscription_ends_at) > new Date());
    } else if (statusFilter === 'trial') {
      matchesStatus = client.trial_ends_at && new Date(client.trial_ends_at) > new Date();
    } else if (statusFilter === 'expired') {
      matchesStatus = client.subscription_ends_at && new Date(client.subscription_ends_at) < new Date();
    } else if (statusFilter === 'cancelled') {
      matchesStatus = !client.is_active;
    }
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredClients.length} client(s) trouvé(s)
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entreprise</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Modules</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={client.logo_url} alt={client.name} />
                    <AvatarFallback>
                      <Building2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {client.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {getPlanBadge(client.plan)}
              </TableCell>
              <TableCell>
                {getStatusBadge(client)}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">
                    {client.modules_enabled?.length || 0} modules
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatDistanceToNow(new Date(client.created_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onClientSelect(client.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
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

      {filteredClients.length === 0 && (
        <div className="text-center py-8">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">Aucun client trouvé</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucun client ne correspond à vos critères de recherche.
          </p>
        </div>
      )}
    </div>
  );
};

export default LeazrClientsList;

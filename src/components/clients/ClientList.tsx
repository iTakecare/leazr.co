
import React, { useState, useMemo } from "react";
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Edit, Trash2, Building2, Mail, Phone, MapPin, MoreHorizontal, User, ArrowUp, ArrowDown, Bot } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import VoiceCampaignModal from "@/components/clients/VoiceCampaignModal";
import { formatDateToFrench } from "@/utils/formatters";
import { Client } from "@/types/client";
import { forceRefreshCRMCache } from "@/utils/crmCacheUtils";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KYC_SCORE_COLORS, KYC_SCORE_LABELS, KycScoreLetter } from "@/services/clients/clientKycScore";

type SortField = 'name' | 'company' | 'email' | 'phone' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc' | null;

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
  const { navigateToAdmin } = useRoleNavigation();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaignOpen, setCampaignOpen] = useState(false);

  const toggleClient = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedClients = useMemo(() => {
    if (!sortField || !sortDirection) return clients;
    
    return [...clients].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (!aValue) aValue = '';
      if (!bValue) bValue = '';
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clients, sortField, sortDirection]);

  const SortableHeader = ({ 
    field, 
    label 
  }: { 
    field: SortField; 
    label: string;
  }) => {
    const isActive = sortField === field;
    
    return (
      <TableHead 
        className="cursor-pointer select-none hover:bg-muted/50"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <div className="flex flex-col">
            <ArrowUp 
              className={cn(
                "h-3 w-3",
                isActive && sortDirection === 'asc' 
                  ? "text-primary" 
                  : "text-muted-foreground/30"
              )}
            />
            <ArrowDown 
              className={cn(
                "h-3 w-3 -mt-1",
                isActive && sortDirection === 'desc' 
                  ? "text-primary" 
                  : "text-muted-foreground/30"
              )}
            />
          </div>
        </div>
      </TableHead>
    );
  };

  const handleViewClient = (client: Client) => {
    console.log("Viewing client:", client);
    if (client.id) {
      console.log("Navigating to client detail:", `clients/${client.id}`);
      navigateToAdmin(`clients/${client.id}`);
      onViewClient(client.id);
    } else {
      console.error("Client ID is missing:", client);
    }
  };

  const handleEditClient = (client: Client) => {
    console.log("Editing client:", client);
    if (client.id) {
      console.log("Navigating to client detail with edit mode:", `clients/${client.id}?edit=true`);
      navigateToAdmin(`clients/${client.id}?edit=true`);
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
          <Button onClick={() => navigateToAdmin('clients/new')}>
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

  const allSelected = sortedClients.length > 0 && selected.size === sortedClients.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(sortedClients.map((c) => c.id)));
  };
  const selectedClients = sortedClients
    .filter((c) => selected.has(c.id))
    .map((c) => ({ id: c.id, name: c.name || c.company || c.email || c.id }));

  return (
    <div className="bg-white rounded-lg border">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-violet-50">
          <span className="text-sm text-violet-900 font-medium">{selected.size} client(s) sélectionné(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Désélectionner</Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setCampaignOpen(true)}>
              <Bot className="w-4 h-4 mr-2" />
              Appeler en groupe avec Alex
            </Button>
          </div>
        </div>
      )}
      <VoiceCampaignModal
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
        clients={selectedClients}
        onLaunched={() => setSelected(new Set())}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
                aria-label="Tout sélectionner"
              />
            </TableHead>
            <SortableHeader field="name" label="Nom" />
            <SortableHeader field="company" label="Société" />
            <TableHead>KYC</TableHead>
            <SortableHeader field="email" label="Email" />
            <SortableHeader field="phone" label="Téléphone" />
            <SortableHeader field="status" label="Statut" />
            <SortableHeader field="created_at" label="Date de création" />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClients.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleViewClient(client)}>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected.has(client.id)}
                  onCheckedChange={() => toggleClient(client.id)}
                  aria-label={`Sélectionner ${client.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{client.name}</div>
                {client.contact_name && client.contact_name !== client.name && (
                  <div className="text-sm text-gray-500">Contact: {client.contact_name}</div>
                )}
              </TableCell>
              <TableCell>
                {client.company ? (
                  <div>
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{client.company}</span>
                    </div>
                    {(client.legal_form || client.company_creation_date) && (
                      <div className="text-xs text-gray-500 mt-0.5 ml-6">
                        {client.legal_form}
                        {client.legal_form && client.company_creation_date && " · "}
                        {client.company_creation_date &&
                          `créée ${new Date(client.company_creation_date).toLocaleDateString("fr-BE", { month: "2-digit", year: "numeric" })}`}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {client.kyc_score ? (
                  <KycScoreCell letter={client.kyc_score as 'A' | 'B' | 'C' | 'D'} />
                ) : (
                  <span className="text-xs text-gray-300 italic">non évalué</span>
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
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

const KycScoreCell: React.FC<{ letter: KycScoreLetter }> = ({ letter }) => {
  const colors = KYC_SCORE_COLORS[letter];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-md border-2 font-extrabold text-sm cursor-help",
              colors.bg,
              colors.text,
              colors.border,
            )}
          >
            {letter}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-xs font-semibold">{KYC_SCORE_LABELS[letter]}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ClientList;

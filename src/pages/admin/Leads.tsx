import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Upload,
  Search,
  Check,
  X,
  Mail,
  Phone,
  Building2,
  Inbox,
  Facebook,
  Globe,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLeads, useLeadMutations } from '@/hooks/crm/useLeads';
import LeadImportDialog from '@/components/crm/leads/LeadImportDialog';
import type { LeadFilters, RawLead } from '@/services/crm/leadService';

const SOURCE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  meta: { label: 'Meta', icon: Facebook },
  website_form: { label: 'Formulaire site', icon: Globe },
  csv_import: { label: 'Import', icon: FileSpreadsheet },
  manual: { label: 'Manuel', icon: Inbox },
  api: { label: 'API', icon: Globe },
};

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const { companySlug } = useParams<{ companySlug: string }>();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadFilters['status']>('new');
  const [importOpen, setImportOpen] = useState(false);

  const filters: LeadFilters = useMemo(
    () => ({ search: search.trim() || undefined, status }),
    [search, status]
  );

  const { data: leads = [], isLoading } = useLeads(filters);
  const { qualify, reject } = useLeadMutations();

  const handleQualify = async (lead: RawLead) => {
    const opportunityId = await qualify.mutateAsync({ leadId: lead.id });
    if (opportunityId) navigate(`/${companySlug}/admin/opportunities/${opportunityId}`);
  };

  const displayName = (lead: RawLead) =>
    [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
    lead.company_name ||
    lead.email ||
    'Lead sans nom';

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Les contacts entrants et les listes importées, avant qu'ils ne deviennent des affaires.
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importer une liste
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un lead…"
            className="pl-8"
          />
        </div>
        <Select value={status ?? 'new'} onValueChange={(v) => setStatus(v as LeadFilters['status'])}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">À qualifier</SelectItem>
            <SelectItem value="qualified">Qualifiés</SelectItem>
            <SelectItem value="rejected">Écartés</SelectItem>
            <SelectItem value="all">Tous</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && leads.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium">Aucun lead {status === 'new' ? 'à qualifier' : ''}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Importez une liste de prospection, ou branchez le formulaire de votre site — les
              soumissions arriveront ici automatiquement. Les demandes Meta, elles, créent déjà
              directement une opportunité.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {leads.map((lead) => {
          const meta = SOURCE_META[lead.source] ?? SOURCE_META.manual;
          const SourceIcon = meta.icon;
          return (
            <Card key={lead.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{displayName(lead)}</span>
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <SourceIcon className="h-2.5 w-2.5" />
                      {meta.label}
                    </Badge>
                    {lead.utm_campaign && (
                      <Badge variant="secondary" className="text-[10px]">
                        {lead.utm_campaign}
                      </Badge>
                    )}
                    {lead.status === 'qualified' && (
                      <Badge className="bg-emerald-600 text-[10px]">Qualifié</Badge>
                    )}
                    {lead.status === 'rejected' && (
                      <Badge variant="destructive" className="text-[10px]">
                        Écarté
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {lead.company_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {lead.company_name}
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(parseISO(lead.received_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>

                  {lead.message && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{lead.message}</p>
                  )}
                </div>

                {lead.status === 'new' && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleQualify(lead)}
                      disabled={qualify.isPending}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Qualifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        reject.mutate({ leadId: lead.id, reason: 'Écarté manuellement' })
                      }
                      disabled={reject.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {lead.status === 'qualified' && lead.opportunity_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(`/${companySlug}/admin/opportunities/${lead.opportunity_id}`)
                    }
                  >
                    Voir l'affaire
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
};

export default Leads;

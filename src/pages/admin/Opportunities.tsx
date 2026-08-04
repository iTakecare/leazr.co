import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useCompanyProfiles } from '@/hooks/useTasks';
import {
  useOpportunities,
  usePipelineStages,
  useOpportunityMutations,
  useOutcomeSummary,
} from '@/hooks/crm/useOpportunities';
import PipelineKanban from '@/components/crm/opportunities/PipelineKanban';
import OpportunityDialog from '@/components/crm/opportunities/OpportunityDialog';
import OpportunityCard from '@/components/crm/opportunities/OpportunityCard';
import LeadsPanel from '@/components/crm/leads/LeadsPanel';
import { useLeads } from '@/hooks/crm/useLeads';
import type { OpportunityFilters, OpportunityWithRelations } from '@/services/crm/types';

const ALL = '__all__';
const MINE = '__mine__';

const formatEuro = (value: number) => value.toLocaleString('fr-BE', { maximumFractionDigits: 0 });

const Opportunities: React.FC = () => {
  const navigate = useNavigate();
  const { companySlug } = useParams<{ companySlug: string }>();
  const { user } = useAuth();

  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<OpportunityFilters['status']>('open');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [reactivationOnly, setReactivationOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Un lead n'est qu'une affaire pas encore acceptée : les deux vivent dans le
  // même écran, on ne fait que changer d'onglet.
  const [tab, setTab] = useState<'pipeline' | 'leads'>('pipeline');

  const resolvedOwner =
    ownerFilter === ALL ? null : ownerFilter === MINE ? user?.id ?? null : ownerFilter;

  const filters: OpportunityFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      ownerId: resolvedOwner,
      status: statusFilter,
      overdueOnly: overdueOnly || undefined,
      tags: reactivationOnly ? ['reactivation'] : undefined,
    }),
    [search, resolvedOwner, statusFilter, overdueOnly, reactivationOnly]
  );

  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages();
  const { data: opportunities = [], isLoading } = useOpportunities(filters);
  const { data: outcomes } = useOutcomeSummary(resolvedOwner);
  const { data: profiles = [] } = useCompanyProfiles();
  const { moveStage } = useOpportunityMutations();
  const { data: newLeads = [] } = useLeads({ status: 'new' });
  const pendingLeads = newLeads.length;

  // Gagné/Perdu sont des issues, pas des colonnes où empiler des cartes.
  const openStages = useMemo(() => stages.filter((s) => !s.is_won && !s.is_lost), [stages]);

  const totals = useMemo(() => {
    const stageById = new Map(stages.map((s) => [s.id, s]));
    const openOnes = opportunities.filter((o) => o.status === 'open');
    const monthly = openOnes.reduce((sum, o) => sum + (o.estimated_monthly_payment ?? 0), 0);
    const weighted = openOnes.reduce((sum, o) => {
      const probability = o.stage_id ? stageById.get(o.stage_id)?.probability ?? 0 : 0;
      return sum + ((o.estimated_monthly_payment ?? 0) * probability) / 100;
    }, 0);
    const overdue = openOnes.filter(
      (o) => o.next_action_at && new Date(o.next_action_at) < new Date()
    ).length;
    return { monthly, weighted, overdue, count: openOnes.length };
  }, [opportunities, stages]);

  const openDetail = (opportunity: OpportunityWithRelations) =>
    navigate(`/${companySlug}/admin/opportunities/${opportunity.id}`);

  const showOutcome = (status: 'won' | 'lost') => {
    setStatusFilter(status);
    setView('list');
  };

  const isKanban = view === 'kanban' && statusFilter === 'open';

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunités</h1>
          <p className="text-sm text-muted-foreground">
            Le pipeline commercial — de la prise de contact à la signature.
          </p>
        </div>
        {tab === 'pipeline' && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle opportunité
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'pipeline' | 'leads')}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">
            Leads
            {pendingLeads > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {pendingLeads}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'leads' ? (
        <LeadsPanel />
      ) : (
      <>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-3.5">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-muted-foreground">Affaires en cours</p>
              <p className="text-lg font-bold">{totals.count}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3.5">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-muted-foreground">Pipeline (mensuel)</p>
              <p className="text-lg font-bold">{formatEuro(totals.monthly)} €</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3.5">
            <Trophy className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Prévisionnel pondéré</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatEuro(totals.weighted)} €
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={totals.overdue > 0 ? 'border-red-200' : undefined}>
          <CardContent className="flex items-center gap-3 p-3.5">
            <AlertTriangle
              className={`h-4 w-4 ${totals.overdue > 0 ? 'text-red-500' : 'text-slate-400'}`}
            />
            <div>
              <p className="text-xs text-muted-foreground">Actions en retard</p>
              <p className={`text-lg font-bold ${totals.overdue > 0 ? 'text-red-600' : ''}`}>
                {totals.overdue}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une opportunité…"
            className="pl-8"
          />
        </div>

        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les commerciaux</SelectItem>
            <SelectItem value={MINE}>Mon portefeuille</SelectItem>
            {(profiles as any[]).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter ?? 'open'}
          onValueChange={(v) => setStatusFilter(v as OpportunityFilters['status'])}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">En cours</SelectItem>
            <SelectItem value="won">Gagnées</SelectItem>
            <SelectItem value="lost">Perdues</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={overdueOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOverdueOnly((v) => !v)}
        >
          <AlertTriangle className="mr-1.5 h-4 w-4" />
          En retard
        </Button>

        {/* Affaires perdues faute de réponse, encore fraîches, client jamais
            signé : le gisement à retravailler. Elles sont closes, donc la vue
            bascule d'office en liste. */}
        <Button
          variant={reactivationOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            const next = !reactivationOnly;
            setReactivationOnly(next);
            if (next) {
              setStatusFilter('lost');
              setView('list');
            } else {
              setStatusFilter('open');
            }
          }}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          À réactiver
        </Button>

        <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
          <TabsList>
            <TabsTrigger value="kanban" disabled={statusFilter !== 'open'}>
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isKanban ? (
        <PipelineKanban
          stages={openStages}
          opportunities={opportunities}
          loading={isLoading || stagesLoading}
          onMove={(id, stageId) => moveStage.mutate({ id, stageId })}
          onOpen={openDetail}
          won={outcomes?.won}
          lost={outcomes?.lost}
          onShowWon={() => showOutcome('won')}
          onShowLost={() => showOutcome('lost')}
        />
      ) : (
        <div className="space-y-3">
          {statusFilter !== 'open' && (
            <p className="text-xs text-muted-foreground">
              {reactivationOnly
                ? "Perdues faute de réponse, moins de 6 mois, client jamais signé — le gisement encore récupérable."
                : statusFilter === 'won'
                  ? 'Affaires signées — offre convertie en contrat, financée ou facturée.'
                  : statusFilter === 'lost'
                    ? 'Affaires closes sans suite ou refusées.'
                    : 'Toutes les affaires, closes comprises.'}
              {opportunities.length >= 300 && ' 300 plus récentes affichées.'}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {!isLoading && opportunities.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune opportunité pour ces filtres.</p>
            )}
            {opportunities.map((o) => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                showStage
                onClick={() => openDetail(o)}
              />
            ))}
          </div>
        </div>
      )}

      </>
      )}

      <OpportunityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default Opportunities;

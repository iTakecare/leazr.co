import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Pencil,
  Trophy,
  XCircle,
  CalendarClock,
  Euro,
  FileText,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useOpportunity,
  usePipelineStages,
  useOpportunityMutations,
} from '@/hooks/crm/useOpportunities';
import {
  useOpportunityActivities,
  useActivityMutations,
} from '@/hooks/crm/useCrmActivities';
import ActivityTimeline from '@/components/crm/opportunities/ActivityTimeline';
import OpportunityDialog from '@/components/crm/opportunities/OpportunityDialog';
import { CHANNEL_LABELS, LOST_REASONS, type CrmChannel } from '@/services/crm/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const OpportunityDetail: React.FC = () => {
  const { id, companySlug } = useParams<{ id: string; companySlug: string }>();
  const navigate = useNavigate();

  const { data: opportunity, isLoading } = useOpportunity(id);
  const { data: stages = [] } = usePipelineStages();
  const { data: activities = [], isLoading: activitiesLoading } = useOpportunityActivities(id);
  const { moveStage, markLost, planNextAction } = useOpportunityMutations();
  const { log } = useActivityMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [lostDetail, setLostDetail] = useState('');
  const [note, setNote] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [nextChannel, setNextChannel] = useState<string>('');
  const [nextNote, setNextNote] = useState('');

  // Offres rattachées à cette opportunité (une affaire peut en porter plusieurs :
  // relances, versions, renouvellements)
  const { data: offers = [] } = useQuery({
    queryKey: ['opportunity-offers', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('id, dossier_number, client_name, monthly_payment, workflow_status, created_at')
        .eq('opportunity_id', id!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!opportunity) {
    return <div className="p-6 text-sm text-muted-foreground">Opportunité introuvable.</div>;
  }

  const wonStage = stages.find((s) => s.is_won);
  const lostStage = stages.find((s) => s.is_lost);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    await log.mutateAsync({
      opportunity_id: opportunity.id,
      client_id: opportunity.client_id,
      contact_id: opportunity.primary_contact_id,
      type: 'note',
      direction: 'internal',
      body: note.trim(),
    });
    setNote('');
  };

  const handlePlan = async () => {
    await planNextAction.mutateAsync({
      id: opportunity.id,
      at: nextAt ? new Date(`${nextAt}T09:00:00`).toISOString() : null,
      channel: (nextChannel || null) as CrmChannel | null,
      note: nextNote.trim() || null,
    });
    setNextAt('');
    setNextChannel('');
    setNextNote('');
  };

  const handleLost = async () => {
    if (!lostStage || !lostReason) return;
    await markLost.mutateAsync({
      id: opportunity.id,
      lostStageId: lostStage.id,
      reason: lostReason,
      detail: lostDetail.trim() || undefined,
    });
    setLostOpen(false);
  };

  return (
    <div className="space-y-5 p-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/${companySlug}/admin/opportunities`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au pipeline
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{opportunity.name}</h1>
            {opportunity.stage && (
              <Badge
                variant="outline"
                style={{ borderColor: opportunity.stage.color, color: opportunity.stage.color }}
              >
                {opportunity.stage.label}
              </Badge>
            )}
            {opportunity.status === 'won' && (
              <Badge className="bg-emerald-600">Gagnée</Badge>
            )}
            {opportunity.status === 'lost' && <Badge variant="destructive">Perdue</Badge>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {opportunity.client && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {opportunity.client.company || opportunity.client.name}
              </span>
            )}
            {opportunity.contact?.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {opportunity.contact.email}
              </span>
            )}
            {opportunity.contact?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {opportunity.contact.phone}
              </span>
            )}
            {opportunity.owner && (
              <span>
                Commercial :{' '}
                {`${opportunity.owner.first_name ?? ''} ${opportunity.owner.last_name ?? ''}`.trim()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          {opportunity.status === 'open' && wonStage && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => moveStage.mutate({ id: opportunity.id, stageId: wonStage.id })}
            >
              <Trophy className="mr-2 h-4 w-4" />
              Marquer gagnée
            </Button>
          )}
          {opportunity.status === 'open' && lostStage && (
            <Button variant="outline" size="sm" onClick={() => setLostOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              Marquer perdue
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Journal des interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="timeline">
                <TabsList className="mb-4">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="note">Ajouter une note</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline">
                  <ActivityTimeline
                    activities={activities}
                    loading={activitiesLoading}
                    emptyLabel="Aucune interaction — appels, emails, WhatsApp et changements d'étape s'afficheront ici automatiquement."
                  />
                </TabsContent>

                <TabsContent value="note" className="space-y-3">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="Ce qui s'est dit, ce qui a été convenu…"
                  />
                  <Button onClick={handleAddNote} disabled={!note.trim() || log.isPending}>
                    <StickyNote className="mr-2 h-4 w-4" />
                    Enregistrer la note
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prochaine action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunity.next_action_at && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-medium">
                    <CalendarClock className="h-4 w-4" />
                    {format(parseISO(opportunity.next_action_at), 'd MMMM yyyy', { locale: fr })}
                  </p>
                  {opportunity.next_action_channel && (
                    <p className="mt-0.5 text-muted-foreground">
                      Canal : {CHANNEL_LABELS[opportunity.next_action_channel]}
                    </p>
                  )}
                  {opportunity.next_action_note && (
                    <p className="mt-0.5 text-muted-foreground">{opportunity.next_action_note}</p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="next-at">Replanifier</Label>
                <Input
                  id="next-at"
                  type="date"
                  value={nextAt}
                  onChange={(e) => setNextAt(e.target.value)}
                />
              </div>
              <Select value={nextChannel} onValueChange={setNextChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={nextNote}
                onChange={(e) => setNextNote(e.target.value)}
                placeholder="Pour faire quoi ?"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePlan}
                disabled={planNextAction.isPending}
              >
                Planifier
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chiffres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mensualité estimée</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Euro className="h-3.5 w-3.5" />
                  {opportunity.estimated_monthly_payment?.toLocaleString('fr-BE') ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Probabilité</span>
                <span className="font-semibold">{opportunity.stage?.probability ?? 0} %</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Clôture espérée</span>
                <span>
                  {opportunity.expected_close_date
                    ? format(parseISO(opportunity.expected_close_date), 'd MMM yyyy', {
                        locale: fr,
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source</span>
                <span>{opportunity.source ?? '—'}</span>
              </div>
              {opportunity.lost_reason && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Motif de perte</span>
                  <span>
                    {LOST_REASONS.find((r) => r.value === opportunity.lost_reason)?.label ??
                      opportunity.lost_reason}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Offres liées ({offers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {offers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune offre chiffrée pour cette affaire.
                </p>
              )}
              {(offers as any[]).map((offer) => (
                <button
                  key={offer.id}
                  onClick={() => navigate(`/${companySlug}/admin/offers/${offer.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {offer.dossier_number ?? offer.id.slice(0, 8)}
                  </span>
                  <span className="text-muted-foreground">
                    {offer.monthly_payment
                      ? `${Number(offer.monthly_payment).toLocaleString('fr-BE')} €`
                      : '—'}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <OpportunityDialog open={editOpen} onOpenChange={setEditOpen} opportunity={opportunity} />

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer l'opportunité perdue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Motif</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un motif" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Précision</Label>
              <Textarea
                value={lostDetail}
                onChange={(e) => setLostDetail(e.target.value)}
                rows={3}
                placeholder="Facultatif — alimente l'analyse des pertes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleLost} disabled={!lostReason}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpportunityDetail;

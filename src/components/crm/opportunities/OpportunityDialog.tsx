import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ClientSelector from '@/components/ui/ClientSelector';
import { useCompanyProfiles } from '@/hooks/useTasks';
import { usePipelineStages, useOpportunityMutations } from '@/hooks/crm/useOpportunities';
import { CHANNEL_LABELS, type CrmChannel, type OpportunityWithRelations } from '@/services/crm/types';

const SOURCES = [
  { value: 'recommendation', label: 'Recommandation' },
  { value: 'google', label: 'Google' },
  { value: 'meta', label: 'Meta (Facebook / Instagram)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'existing_client', label: 'Client existant' },
  { value: 'website', label: 'Site web' },
  { value: 'event', label: 'Salon / événement' },
  { value: 'outbound', label: 'Prospection sortante' },
  { value: 'other', label: 'Autre' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opportunité à modifier ; absente = création. */
  opportunity?: OpportunityWithRelations | null;
}

const OpportunityDialog: React.FC<Props> = ({ open, onOpenChange, opportunity }) => {
  const isEdit = !!opportunity;
  const { data: stages = [] } = usePipelineStages();
  const { data: profiles = [] } = useCompanyProfiles();
  const { create, update } = useOpportunityMutations();

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string>('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [monthly, setMonthly] = useState<string>('');
  const [closeDate, setCloseDate] = useState<string>('');
  const [nextActionAt, setNextActionAt] = useState<string>('');
  const [nextActionChannel, setNextActionChannel] = useState<string>('');
  const [nextActionNote, setNextActionNote] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    if (opportunity) {
      setName(opportunity.name);
      setClientId(opportunity.client_id);
      setStageId(opportunity.stage_id ?? '');
      setOwnerId(opportunity.owner_id ?? '');
      setSource(opportunity.source ?? '');
      setMonthly(opportunity.estimated_monthly_payment?.toString() ?? '');
      setCloseDate(opportunity.expected_close_date ?? '');
      setNextActionAt(opportunity.next_action_at?.slice(0, 10) ?? '');
      setNextActionChannel(opportunity.next_action_channel ?? '');
      setNextActionNote(opportunity.next_action_note ?? '');
      setDescription(opportunity.description ?? '');
    } else {
      setName('');
      setClientId(null);
      setStageId(stages.find((s) => s.is_default)?.id ?? stages[0]?.id ?? '');
      setOwnerId('');
      setSource('');
      setMonthly('');
      setCloseDate('');
      setNextActionAt('');
      setNextActionChannel('');
      setNextActionNote('');
      setDescription('');
    }
  }, [open, opportunity, stages]);

  const buildPayload = () => ({
    name: name.trim(),
    client_id: clientId,
    stage_id: stageId || null,
    owner_id: ownerId || null,
    source: source || null,
    estimated_monthly_payment: monthly ? Number(monthly) : null,
    expected_close_date: closeDate || null,
    // On stocke la date d'action au début de journée : le tri « en retard »
    // se fait à la journée, pas à l'heure près.
    next_action_at: nextActionAt ? new Date(`${nextActionAt}T09:00:00`).toISOString() : null,
    next_action_channel: (nextActionChannel || null) as CrmChannel | null,
    next_action_note: nextActionNote.trim() || null,
    description: description.trim() || null,
  });

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const payload = buildPayload();

    if (isEdit && opportunity) {
      await update.mutateAsync({ id: opportunity.id, patch: payload as any });
    } else {
      await create.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'opportunité" : 'Nouvelle opportunité'}</DialogTitle>
          <DialogDescription>
            Une opportunité suit le cycle de vente. Elle peut exister sans aucune offre chiffrée —
            c'est ce qui permet de suivre un prospect qu'on chasse depuis des mois.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="opp-name">Intitulé *</Label>
            <Input
              id="opp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Renouvellement parc portables — Dupont SRL"
            />
          </div>

          <div className="grid gap-2">
            <Label>Client</Label>
            <ClientSelector selectedClientId={clientId} onClientSelect={setClientId} />
            <p className="text-xs text-muted-foreground">
              Facultatif : une opportunité peut viser une entreprise pas encore créée en base.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Étape</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Commercial</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="opp-monthly">Mensualité estimée (€)</Label>
              <Input
                id="opp-monthly"
                type="number"
                min="0"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="opp-close">Clôture espérée</Label>
              <Input
                id="opp-close"
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-3">
            <p className="mb-3 text-sm font-medium">Prochaine action</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="opp-next">Quand</Label>
                <Input
                  id="opp-next"
                  type="date"
                  value={nextActionAt}
                  onChange={(e) => setNextActionAt(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Par quel canal</Label>
                <Select value={nextActionChannel} onValueChange={setNextActionChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <Label htmlFor="opp-next-note">Pour faire quoi</Label>
              <Input
                id="opp-next-note"
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
                placeholder="Ex : relancer sur le devis, obtenir le bilan"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="opp-desc">Contexte</Label>
            <Textarea
              id="opp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Besoin identifié, interlocuteurs, historique…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || pending}>
            {isEdit ? 'Enregistrer' : "Créer l'opportunité"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpportunityDialog;

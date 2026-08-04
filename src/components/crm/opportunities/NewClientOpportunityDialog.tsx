import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Target, Repeat, ArrowRight } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useCompanyProfiles } from '@/hooks/useTasks';
import { usePipelineStages } from '@/hooks/crm/useOpportunities';
import { useSequences, useSequenceMutations } from '@/hooks/crm/useSequences';
import { createOpportunity } from '@/services/crm/opportunityService';
import { CHANNEL_LABELS, type CrmChannel } from '@/services/crm/types';
import { toast } from 'sonner';

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

const NONE = '__none__';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: { id: string; name: string; company?: string | null } | null;
  /** Appelé quand l'utilisateur choisit de ne pas ouvrir d'affaire. */
  onSkip: () => void;
}

/**
 * Proposé juste après la création d'un client : ouvrir l'affaire dans la
 * foulée, et éventuellement lancer la cadence de relance. Sans ça, le client
 * existe en base mais n'apparaît nulle part dans le pipeline.
 */
const NewClientOpportunityDialog: React.FC<Props> = ({ open, onOpenChange, client, onSkip }) => {
  const navigate = useNavigate();
  const { companySlug } = useParams<{ companySlug: string }>();
  const { user } = useAuth();
  const { companyId } = useMultiTenant();

  const { data: stages = [] } = usePipelineStages();
  const { data: profiles = [] } = useCompanyProfiles();
  const { data: sequences = [] } = useSequences();
  const { enroll } = useSequenceMutations();

  const [name, setName] = useState('');
  const [stageId, setStageId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [source, setSource] = useState('');
  const [monthly, setMonthly] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [nextChannel, setNextChannel] = useState('');
  const [sequenceId, setSequenceId] = useState(NONE);
  const [saving, setSaving] = useState(false);

  const openStages = stages.filter((s) => !s.is_won && !s.is_lost);
  const activeSequences = sequences.filter(
    (s) => s.status === 'active' && (s.steps ?? []).length > 0
  );

  useEffect(() => {
    if (!open || !client) return;
    setName(client.company || client.name);
    setStageId(stages.find((s) => s.is_default)?.id ?? openStages[0]?.id ?? '');
    setOwnerId(user?.id ?? '');
    setSource('');
    setMonthly('');
    setNextAt('');
    setNextChannel('');
    setSequenceId(NONE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client, stages]);

  const handleCreate = async () => {
    if (!client || !companyId || !name.trim()) return;
    setSaving(true);
    try {
      const opportunity = await createOpportunity({
        company_id: companyId,
        name: name.trim(),
        client_id: client.id,
        stage_id: stageId || null,
        owner_id: ownerId || user?.id || null,
        source: source || null,
        created_from: 'manual',
        estimated_monthly_payment: monthly ? Number(monthly) : null,
        next_action_at: nextAt ? new Date(`${nextAt}T09:00:00`).toISOString() : null,
        next_action_channel: (nextChannel || null) as CrmChannel | null,
      });

      if (!opportunity) {
        toast.error("Création de l'opportunité impossible");
        return;
      }

      if (sequenceId !== NONE) {
        // L'inscription remonte son propre message d'erreur : une séquence qui
        // échoue ne doit pas faire perdre l'opportunité qui vient d'être créée.
        await enroll.mutateAsync({ sequenceId, opportunityId: opportunity.id }).catch(() => null);
      }

      toast.success('Opportunité ouverte');
      onOpenChange(false);
      navigate(`/${companySlug}/admin/opportunities/${opportunity.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ouvrir une affaire pour ce client ?
          </DialogTitle>
          <DialogDescription>
            {client?.company || client?.name} est enregistré. Sans opportunité, il n'apparaîtra
            dans aucun pipeline et personne ne sera relancé à son sujet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="opp-name">Intitulé de l'affaire *</Label>
            <Input id="opp-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Étape de départ</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {openStages.map((s) => (
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
              <Label htmlFor="opp-monthly">Mensualité estimée</Label>
              <Input
                id="opp-monthly"
                type="number"
                min="0"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                placeholder="€ / mois"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opp-next">Prochaine action</Label>
              <Input
                id="opp-next"
                type="date"
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
              />
            </div>
          </div>

          {nextAt && (
            <div className="grid gap-2">
              <Label>Par quel canal</Label>
              <Select value={nextChannel} onValueChange={setNextChannel}>
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
          )}

          <div className="rounded-lg border border-dashed p-3">
            <Label className="flex items-center gap-1.5">
              <Repeat className="h-4 w-4" />
              Lancer une séquence de relance
            </Label>
            <Select value={sequenceId} onValueChange={setSequenceId}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucune</SelectItem>
                {activeSequences.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {activeSequences.length === 0
                ? "Aucune séquence active. Vous pourrez en lancer une plus tard depuis la fiche de l'affaire."
                : "La cadence démarre immédiatement et s'arrête dès que le client répond."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onSkip} disabled={saving}>
            Plus tard
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || saving}>
            Ouvrir l'affaire
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewClientOpportunityDialog;

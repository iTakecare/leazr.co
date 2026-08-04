import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Mail, MessageSquare, Phone, Bot, GripVertical } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePipelineStages } from '@/hooks/crm/useOpportunities';
import { useSequenceMutations } from '@/hooks/crm/useSequences';
import {
  CHANNEL_LABELS,
  TRIGGER_LABELS,
  splitDelay,
  toMinutes,
  type Sequence,
  type SequenceStep,
  type StepChannel,
  type SequenceTrigger,
} from '@/services/crm/sequenceService';

const CHANNEL_ICONS: Record<StepChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  call_task: Phone,
  voice_ai: Bot,
};

type DraftStep = Omit<SequenceStep, 'id' | 'sequence_id'> & {
  delayValue: number;
  delayUnit: 'minutes' | 'hours' | 'days';
};

const emptyStep = (): DraftStep => ({
  position: 0,
  delay_minutes: 1440,
  delayValue: 1,
  delayUnit: 'days',
  channel: 'email',
  subject: '',
  body: '',
  template_key: null,
  assigned_to: null,
  active: true,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequence?: Sequence | null;
}

const SequenceEditor: React.FC<Props> = ({ open, onOpenChange, sequence }) => {
  const { data: stages = [] } = usePipelineStages();
  const { save } = useSequenceMutations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<SequenceTrigger>('manual');
  const [triggerValue, setTriggerValue] = useState('');
  const [stopOnReply, setStopOnReply] = useState(true);
  const [stopOnStage, setStopOnStage] = useState(true);
  const [businessHours, setBusinessHours] = useState(true);
  const [steps, setSteps] = useState<DraftStep[]>([]);

  useEffect(() => {
    if (!open) return;
    if (sequence) {
      setName(sequence.name);
      setDescription(sequence.description ?? '');
      setTrigger(sequence.trigger_type);
      setTriggerValue(
        sequence.trigger_config?.source ??
          sequence.trigger_config?.stage_key ??
          sequence.trigger_config?.tag ??
          ''
      );
      setStopOnReply(sequence.stop_on_reply);
      setStopOnStage(sequence.stop_on_stage_change);
      setBusinessHours(sequence.business_hours_only);
      setSteps(
        (sequence.steps ?? []).map((s) => {
          const { value, unit } = splitDelay(s.delay_minutes);
          return { ...s, delayValue: value, delayUnit: unit };
        })
      );
    } else {
      setName('');
      setDescription('');
      setTrigger('manual');
      setTriggerValue('');
      setStopOnReply(true);
      setStopOnStage(true);
      setBusinessHours(true);
      setSteps([{ ...emptyStep(), delay_minutes: 0, delayValue: 0, delayUnit: 'minutes' }]);
    }
  }, [open, sequence]);

  const updateStep = (index: number, patch: Partial<DraftStep>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const triggerConfig = (): Record<string, string> => {
    if (trigger === 'lead_created') return triggerValue ? { source: triggerValue } : {};
    if (trigger === 'stage_entered') return triggerValue ? { stage_key: triggerValue } : {};
    if (trigger === 'tag_added') return triggerValue ? { tag: triggerValue } : {};
    return {};
  };

  const handleSave = async () => {
    if (!name.trim() || steps.length === 0) return;
    await save.mutateAsync({
      sequence: {
        id: sequence?.id,
        name: name.trim(),
        description: description.trim() || null,
        trigger_type: trigger,
        trigger_config: triggerConfig(),
        stop_on_reply: stopOnReply,
        stop_on_stage_change: stopOnStage,
        business_hours_only: businessHours,
      },
      steps: steps.map(({ delayValue, delayUnit, ...step }, index) => ({
        ...step,
        position: index + 1,
        delay_minutes: toMinutes(delayValue, delayUnit),
      })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sequence ? 'Modifier la séquence' : 'Nouvelle séquence'}</DialogTitle>
          <DialogDescription>
            Une suite d'actions automatiques sur plusieurs canaux. Elle s'arrête d'elle-même dès
            que le prospect répond.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="seq-name">Nom *</Label>
            <Input
              id="seq-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Premier contact lead Meta"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="seq-desc">Objectif</Label>
            <Input
              id="seq-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="À quoi sert cette séquence"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Déclenchement</Label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as SequenceTrigger)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {trigger !== 'manual' && (
              <div className="grid gap-2">
                <Label>
                  {trigger === 'lead_created'
                    ? 'Source (vide = toutes)'
                    : trigger === 'stage_entered'
                      ? 'Étape'
                      : 'Tag'}
                </Label>
                {trigger === 'stage_entered' ? (
                  <Select value={triggerValue} onValueChange={setTriggerValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    placeholder={trigger === 'lead_created' ? 'meta' : 'reactivation'}
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-2.5 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">S'arrêter dès que le prospect répond</Label>
                <p className="text-xs text-muted-foreground">
                  Continuer à relancer quelqu'un qui vient de répondre est le meilleur moyen de le
                  perdre.
                </p>
              </div>
              <Switch checked={stopOnReply} onCheckedChange={setStopOnReply} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">S'arrêter si l'affaire change d'étape</Label>
              <Switch checked={stopOnStage} onCheckedChange={setStopOnStage} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Heures ouvrées uniquement</Label>
                <p className="text-xs text-muted-foreground">
                  8h-18h, du lundi au vendredi. Sinon l'envoi est reporté, pas annulé.
                </p>
              </div>
              <Switch checked={businessHours} onCheckedChange={setBusinessHours} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Étapes</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSteps((prev) => [...prev, emptyStep()])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter
              </Button>
            </div>

            {steps.map((step, index) => {
              const Icon = CHANNEL_ICONS[step.channel];
              return (
                <div key={index} className="rounded-lg border bg-slate-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold ring-1 ring-slate-200">
                      {index + 1}
                    </span>

                    <Select
                      value={step.channel}
                      onValueChange={(v) => updateStep(index, { channel: v as StepChannel })}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        className="h-8 w-16"
                        value={step.delayValue}
                        onChange={(e) =>
                          updateStep(index, { delayValue: Number(e.target.value) || 0 })
                        }
                      />
                      <Select
                        value={step.delayUnit}
                        onValueChange={(v) =>
                          updateStep(index, { delayUnit: v as DraftStep['delayUnit'] })
                        }
                      >
                        <SelectTrigger className="h-8 w-[95px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">minutes</SelectItem>
                          <SelectItem value="hours">heures</SelectItem>
                          <SelectItem value="days">jours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {index === 0 ? 'après inscription' : 'après l’étape précédente'}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2.5 space-y-2 pl-8">
                    {step.channel === 'email' && (
                      <Input
                        className="h-8"
                        value={step.subject ?? ''}
                        onChange={(e) => updateStep(index, { subject: e.target.value })}
                        placeholder="Objet de l'email"
                      />
                    )}
                    {step.channel === 'call_task' && (
                      <Input
                        className="h-8"
                        value={step.subject ?? ''}
                        onChange={(e) => updateStep(index, { subject: e.target.value })}
                        placeholder="Titre de la tâche"
                      />
                    )}
                    <Textarea
                      rows={step.channel === 'email' ? 4 : 2}
                      value={step.body ?? ''}
                      onChange={(e) => updateStep(index, { body: e.target.value })}
                      placeholder={
                        step.channel === 'call_task'
                          ? "Ce que le commercial doit dire ou obtenir"
                          : step.channel === 'voice_ai'
                            ? "Objectif de l'appel, transmis à Alex"
                            : 'Message — {{prenom}}, {{nom}}, {{societe}}, {{affaire}}'
                      }
                    />
                    {step.channel === 'whatsapp' && (
                      <Input
                        className="h-8"
                        value={step.template_key ?? ''}
                        onChange={(e) => updateStep(index, { template_key: e.target.value || null })}
                        placeholder="Clé de template WhatsApp (hors fenêtre 24 h)"
                      />
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 pl-8 text-[11px] text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {CHANNEL_LABELS[step.channel]}
                    {step.channel === 'whatsapp' &&
                      " — hors fenêtre de 24 h, seul un template validé passe ; l'étape est sautée sinon"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || steps.length === 0 || save.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SequenceEditor;

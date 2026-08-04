import React, { useState } from 'react';
import {
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  Repeat,
  Mail,
  MessageSquare,
  Phone,
  Bot,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSequences, useEnrollmentStats, useSequenceMutations } from '@/hooks/crm/useSequences';
import SequenceEditor from '@/components/crm/sequences/SequenceEditor';
import {
  CHANNEL_LABELS,
  TRIGGER_LABELS,
  formatDelay,
  type Sequence,
  type StepChannel,
} from '@/services/crm/sequenceService';

const CHANNEL_ICONS: Record<StepChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  call_task: Phone,
  voice_ai: Bot,
};

const Sequences: React.FC = () => {
  const { data: sequences = [], isLoading } = useSequences();
  const { data: stats = {} } = useEnrollmentStats();
  const { setStatus, remove } = useSequenceMutations();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);
  const [deleting, setDeleting] = useState<Sequence | null>(null);

  const openEditor = (sequence: Sequence | null) => {
    setEditing(sequence);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Séquences</h1>
          <p className="text-sm text-muted-foreground">
            Les cadences de relance automatiques — email, WhatsApp, SMS, tâche d'appel ou appel
            Alex, enchaînés dans le temps.
          </p>
        </div>
        <Button onClick={() => openEditor(null)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle séquence
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && sequences.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Repeat className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium">Aucune séquence</p>
            <p className="max-w-lg text-sm text-muted-foreground">
              Deux cadences valent le coup d'être créées en premier : un premier contact déclenché
              à la création d'une affaire venant de Meta — c'est le délai de réponse qui fait la
              conversion — et une relance sur le tag « reactivation » pour les affaires perdues
              faute de réponse.
            </p>
            <Button variant="outline" onClick={() => openEditor(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une séquence
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sequences.map((sequence) => {
          const enrollments = stats[sequence.id];
          return (
            <Card key={sequence.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{sequence.name}</span>
                      {sequence.status === 'active' && (
                        <Badge className="bg-emerald-600 text-[10px]">Active</Badge>
                      )}
                      {sequence.status === 'paused' && (
                        <Badge variant="secondary" className="text-[10px]">
                          En pause
                        </Badge>
                      )}
                      {sequence.status === 'draft' && (
                        <Badge variant="outline" className="text-[10px]">
                          Brouillon
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Zap className="h-2.5 w-2.5" />
                        {TRIGGER_LABELS[sequence.trigger_type]}
                        {sequence.trigger_config?.source && ` · ${sequence.trigger_config.source}`}
                        {sequence.trigger_config?.tag && ` · ${sequence.trigger_config.tag}`}
                        {sequence.trigger_config?.stage_key &&
                          ` · ${sequence.trigger_config.stage_key}`}
                      </Badge>
                    </div>

                    {sequence.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{sequence.description}</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {(sequence.steps ?? []).map((step, index) => {
                        const Icon = CHANNEL_ICONS[step.channel];
                        return (
                          <React.Fragment key={step.id}>
                            {index > 0 && <span className="text-xs text-slate-300">→</span>}
                            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px]">
                              <Icon className="h-3 w-3" />
                              {CHANNEL_LABELS[step.channel]}
                              <span className="text-slate-400">{formatDelay(step.delay_minutes)}</span>
                            </span>
                          </React.Fragment>
                        );
                      })}
                      {(sequence.steps ?? []).length === 0 && (
                        <span className="text-xs text-amber-600">
                          Aucune étape — la séquence n'enverra rien
                        </span>
                      )}
                    </div>

                    {enrollments && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {enrollments.active} en cours · {enrollments.completed} terminées ·{' '}
                        {enrollments.stopped} arrêtées
                        {enrollments.failed > 0 && ` · ${enrollments.failed} en échec`}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {sequence.status !== 'active' ? (
                      <Button
                        size="sm"
                        onClick={() => setStatus.mutate({ id: sequence.id, status: 'active' })}
                        disabled={(sequence.steps ?? []).length === 0}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Activer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus.mutate({ id: sequence.id, status: 'paused' })}
                      >
                        <Pause className="mr-1.5 h-3.5 w-3.5" />
                        Pause
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEditor(sequence)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => setDeleting(sequence)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SequenceEditor open={editorOpen} onOpenChange={setEditorOpen} sequence={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleting?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les inscriptions en cours et leur historique d'envois sont supprimés avec elle. Les
              messages déjà partis restent dans la timeline des affaires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleting) remove.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sequences;

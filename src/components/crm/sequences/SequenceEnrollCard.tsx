import React, { useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Repeat, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSequences,
  useOpportunityEnrollments,
  useSequenceMutations,
} from '@/hooks/crm/useSequences';

interface Props {
  opportunityId: string;
  /** Une affaire close ne s'inscrit plus : on affiche l'historique seulement. */
  disabled?: boolean;
}

const STOP_REASONS: Record<string, string> = {
  reply_received: 'le prospect a répondu',
  stage_changed: "l'affaire a changé d'étape",
  opportunity_closed: "l'affaire a été close",
  sequence_inactive: 'séquence désactivée',
};

const SequenceEnrollCard: React.FC<Props> = ({ opportunityId, disabled }) => {
  const { data: sequences = [] } = useSequences();
  const { data: enrollments = [] } = useOpportunityEnrollments(opportunityId);
  const { enroll } = useSequenceMutations();
  const [selected, setSelected] = useState('');

  const activeSequences = sequences.filter(
    (s) => s.status === 'active' && (s.steps ?? []).length > 0
  );
  const enrolledIds = new Set((enrollments as any[]).map((e) => e.sequence?.id));
  const available = activeSequences.filter((s) => !enrolledIds.has(s.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Repeat className="h-4 w-4" />
          Séquences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(enrollments as any[]).map((enrollment) => (
          <div key={enrollment.id} className="rounded-lg border px-2.5 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{enrollment.sequence?.name}</span>
              {enrollment.status === 'active' && (
                <Badge className="shrink-0 bg-emerald-600 text-[10px]">En cours</Badge>
              )}
              {enrollment.status === 'completed' && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  Terminée
                </Badge>
              )}
              {enrollment.status === 'stopped' && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Arrêtée
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Étape {enrollment.current_step}
              {enrollment.status === 'active' && enrollment.next_run_at && (
                <>
                  {' '}
                  · suivante{' '}
                  {formatDistanceToNow(parseISO(enrollment.next_run_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </>
              )}
              {enrollment.stopped_reason && (
                <> · {STOP_REASONS[enrollment.stopped_reason] ?? enrollment.stopped_reason}</>
              )}
            </p>
          </div>
        ))}

        {!disabled && available.length > 0 && (
          <div className="flex gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Inscrire dans…" />
              </SelectTrigger>
              <SelectContent>
                {available.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9 shrink-0"
              disabled={!selected || enroll.isPending}
              onClick={async () => {
                await enroll.mutateAsync({ sequenceId: selected, opportunityId });
                setSelected('');
              }}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {enrollments.length === 0 && available.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {activeSequences.length === 0
              ? 'Aucune séquence active. Créez-en une dans le menu Séquences.'
              : 'Déjà inscrite dans toutes les séquences actives.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SequenceEnrollCard;

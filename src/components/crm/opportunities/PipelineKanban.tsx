import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Trophy, XCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import OpportunityCard from './OpportunityCard';
import type { OpportunityWithRelations, PipelineStage } from '@/services/crm/types';

/** Au-delà, la colonne se replie derrière un « voir les N autres ». */
const VISIBLE_PER_COLUMN = 12;

interface Outcome {
  count: number;
  monthly: number;
}

interface Props {
  stages: PipelineStage[];
  opportunities: OpportunityWithRelations[];
  onMove: (opportunityId: string, stageId: string) => void;
  onOpen: (opportunity: OpportunityWithRelations) => void;
  /** Affaires closes — présentées en fin de tableau, pas en colonnes. */
  won?: Outcome;
  lost?: Outcome;
  onShowWon?: () => void;
  onShowLost?: () => void;
  loading?: boolean;
}

const formatEuro = (value: number) => value.toLocaleString('fr-BE', { maximumFractionDigits: 0 });

const PipelineKanban: React.FC<Props> = ({
  stages,
  opportunities,
  onMove,
  onOpen,
  won,
  lost,
  onShowWon,
  onShowLost,
  loading,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const byStage = useMemo(() => {
    const map = new Map<string, OpportunityWithRelations[]>();
    stages.forEach((s) => map.set(s.id, []));
    opportunities.forEach((o) => {
      if (!o.stage_id) return;
      map.get(o.stage_id)?.push(o);
    });
    // Les actions échues remontent en haut de colonne
    map.forEach((list) =>
      list.sort((a, b) => {
        const aAt = a.next_action_at ? new Date(a.next_action_at).getTime() : Infinity;
        const bAt = b.next_action_at ? new Date(b.next_action_at).getTime() : Infinity;
        if (aAt !== bAt) return aAt - bAt;
        return (b.estimated_monthly_payment ?? 0) - (a.estimated_monthly_payment ?? 0);
      })
    );
    return map;
  }, [stages, opportunities]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    onMove(draggableId, destination.droppableId);
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-64 w-64 shrink-0 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const isExpanded = expanded[stage.id];
          const visible = isExpanded ? items : items.slice(0, VISIBLE_PER_COLUMN);
          const hidden = items.length - visible.length;

          const totalMonthly = items.reduce((sum, o) => sum + (o.estimated_monthly_payment ?? 0), 0);
          const weighted = (totalMonthly * stage.probability) / 100;

          return (
            <div key={stage.id} className="flex w-64 shrink-0 flex-col rounded-lg bg-slate-50/80">
              <div className="rounded-t-lg border-b bg-white px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="truncate text-[13px] font-semibold text-slate-800">
                      {stage.label}
                    </span>
                  </div>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600">
                    {items.length}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between text-[10px] text-slate-400">
                  <span>{formatEuro(totalMonthly)} €/mois</span>
                  <span title={`Pondéré à ${stage.probability} %`}>≈ {formatEuro(weighted)} €</span>
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex min-h-[120px] flex-col gap-1.5 overflow-y-auto p-1.5 transition-colors',
                      // La colonne scrolle sur elle-même : la page ne s'allonge
                      // pas avec la plus grosse étape.
                      'max-h-[calc(100vh-22rem)]',
                      snapshot.isDraggingOver && 'bg-primary/5'
                    )}
                  >
                    {visible.map((opportunity, index) => (
                      <Draggable key={opportunity.id} draggableId={opportunity.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <OpportunityCard
                              opportunity={opportunity}
                              isDragging={dragSnapshot.isDragging}
                              onClick={() => onOpen(opportunity)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {hidden > 0 && (
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [stage.id]: true }))}
                        className="flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[11px] text-slate-500 transition-colors hover:bg-white"
                      >
                        <ChevronDown className="h-3 w-3" />
                        voir les {hidden} autres
                      </button>
                    )}

                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <p className="px-2 py-4 text-center text-[11px] text-slate-400">—</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        {/* Les affaires closes ne sont pas des colonnes où empiler des cartes :
            des centaines de gagnées noieraient le pipeline. Deux tuiles de
            synthèse, cliquables pour basculer en vue liste. */}
        {(won || lost) && (
          <div className="flex w-52 shrink-0 flex-col gap-2">
            {won && (
              <button
                onClick={onShowWon}
                className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-left transition-colors hover:bg-emerald-50"
              >
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="text-[13px] font-semibold">Gagné</span>
                </div>
                <p className="mt-1 text-xl font-bold text-emerald-700">{won.count}</p>
                <p className="text-[11px] text-emerald-600/80">
                  {formatEuro(won.monthly)} €/mois signés
                </p>
              </button>
            )}
            {lost && (
              <button
                onClick={onShowLost}
                className="rounded-lg border bg-white p-3 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-1.5 text-slate-500">
                  <XCircle className="h-3.5 w-3.5" />
                  <span className="text-[13px] font-semibold">Perdu</span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-600">{lost.count}</p>
                <p className="text-[11px] text-slate-400">
                  {formatEuro(lost.monthly)} €/mois non conclus
                </p>
              </button>
            )}
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default PipelineKanban;

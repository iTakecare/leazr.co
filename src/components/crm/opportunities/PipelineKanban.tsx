import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { cn } from '@/lib/utils';
import OpportunityCard from './OpportunityCard';
import type { OpportunityWithRelations, PipelineStage } from '@/services/crm/types';

interface Props {
  stages: PipelineStage[];
  opportunities: OpportunityWithRelations[];
  onMove: (opportunityId: string, stageId: string) => void;
  onOpen: (opportunity: OpportunityWithRelations) => void;
  loading?: boolean;
}

const formatEuro = (value: number) =>
  value.toLocaleString('fr-BE', { maximumFractionDigits: 0 });

const PipelineKanban: React.FC<Props> = ({ stages, opportunities, onMove, onOpen, loading }) => {
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
        return aAt - bAt;
      })
    );
    return map;
  }, [stages, opportunities]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    onMove(draggableId, destination.droppableId);
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-64 w-72 shrink-0 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const totalMonthly = items.reduce(
            (sum, o) => sum + (o.estimated_monthly_payment ?? 0),
            0
          );
          const weighted = (totalMonthly * stage.probability) / 100;

          return (
            <div key={stage.id} className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-50/80">
              <div className="rounded-t-lg border-b bg-white px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-semibold text-slate-800">{stage.label}</span>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                    {items.length}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[11px] text-slate-500">
                  <span>{formatEuro(totalMonthly)} €/mois</span>
                  <span title={`Pondéré à ${stage.probability}%`}>
                    ≈ {formatEuro(weighted)} €
                  </span>
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex min-h-[200px] flex-1 flex-col gap-2 p-2 transition-colors',
                      snapshot.isDraggingOver && 'bg-primary/5'
                    )}
                  >
                    {items.map((opportunity, index) => (
                      <Draggable
                        key={opportunity.id}
                        draggableId={opportunity.id}
                        index={index}
                      >
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

                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <p className="px-2 py-6 text-center text-xs text-slate-400">
                        Aucune opportunité
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default PipelineKanban;

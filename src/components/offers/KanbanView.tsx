import React, { useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { useLocation, useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Phone, Clock, Euro, Building2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

// ─── Column definitions ───────────────────────────────────────────────────────
export const KANBAN_COLUMNS = [
  { id: "draft",                   label: "Brouillon",      color: "slate",   header: "bg-slate-400"  },
  { id: "sent",                    label: "Envoyé",         color: "blue",    header: "bg-blue-500"   },
  { id: "internal_docs_requested", label: "Docs demandés",  color: "amber",   header: "bg-amber-500"  },
  { id: "internal_approved",       label: "Approuvé ITC",   color: "emerald", header: "bg-emerald-600"},
  { id: "leaser_introduced",       label: "Chez le leaser", color: "violet",  header: "bg-violet-500" },
  { id: "leaser_docs_requested",   label: "Docs leaser",    color: "orange",  header: "bg-orange-500" },
  { id: "leaser_approved",         label: "Accordé",        color: "green",   header: "bg-green-600"  },
];

const COLUMN_IDS = new Set(KANBAN_COLUMNS.map((c) => c.id));

const SCORE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-red-100 text-red-700 border-red-200",
  D: "bg-slate-100 text-slate-500 border-slate-200",
};

// ─── Offer card ──────────────────────────────────────────────────────────────
interface Offer {
  id: string;
  client_name: string;
  client_company?: string;
  dossier_number?: string;
  workflow_status: string;
  monthly_payment?: number;
  amount?: number;
  duration?: number;
  internal_score?: string;
  leaser_score?: string;
  created_at: string;
  has_callback?: boolean;
}

const OfferCard: React.FC<{ offer: Offer; index: number; onNavigate: (id: string) => void }> = ({
  offer,
  index,
  onNavigate,
}) => {
  const age = differenceInDays(new Date(), parseISO(offer.created_at));

  return (
    <Draggable draggableId={offer.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onNavigate(offer.id)}
          className={cn(
            "bg-white rounded-lg border p-3 cursor-pointer shadow-sm select-none",
            "hover:shadow-md hover:border-slate-300 transition-all",
            snapshot.isDragging && "shadow-xl rotate-1 border-blue-300"
          )}
        >
          {/* Client name */}
          <p className="text-sm font-semibold text-slate-800 leading-tight truncate">
            {offer.client_name}
          </p>
          {offer.client_company && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
              <Building2 className="h-3 w-3 shrink-0" />
              {offer.client_company}
            </p>
          )}

          {/* Dossier + monthly */}
          <div className="flex items-center justify-between mt-2">
            {offer.dossier_number ? (
              <span className="text-[11px] font-mono text-slate-400">{offer.dossier_number}</span>
            ) : (
              <span />
            )}
            {offer.monthly_payment && offer.monthly_payment > 0 ? (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-0.5">
                <Euro className="h-3 w-3" />
                {offer.monthly_payment.toFixed(0)}/m
              </span>
            ) : null}
          </div>

          {/* Duration + scores + age */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {offer.duration && (
              <span className="text-[10px] text-slate-400">{offer.duration} mois</span>
            )}
            {offer.internal_score && (
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1 py-0 h-4", SCORE_COLORS[offer.internal_score] ?? "")}
              >
                ITC:{offer.internal_score}
              </Badge>
            )}
            {offer.leaser_score && (
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1 py-0 h-4", SCORE_COLORS[offer.leaser_score] ?? "")}
              >
                L:{offer.leaser_score}
              </Badge>
            )}
            <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {age}j
            </span>
            {offer.has_callback && (
              <Phone className="h-3 w-3 text-sky-500" title="Rappel en attente" />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

// ─── Column ───────────────────────────────────────────────────────────────────
const KanbanColumn: React.FC<{
  col: typeof KANBAN_COLUMNS[0];
  offers: Offer[];
  onNavigate: (id: string) => void;
}> = ({ col, offers, onNavigate }) => (
  <div className="flex flex-col min-w-[220px] max-w-[220px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
    {/* Header */}
    <div className={cn("px-3 py-2.5 flex items-center justify-between", col.header)}>
      <h3 className="text-xs font-semibold text-white tracking-wide truncate">{col.label}</h3>
      <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
        {offers.length}
      </span>
    </div>

    {/* Drop zone */}
    <Droppable droppableId={col.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "flex-1 p-2 space-y-2 min-h-[80px] transition-colors",
            snapshot.isDraggingOver && "bg-blue-50"
          )}
        >
          {offers.map((offer, index) => (
            <OfferCard key={offer.id} offer={offer} index={index} onNavigate={onNavigate} />
          ))}
          {provided.placeholder}
          {offers.length === 0 && !snapshot.isDraggingOver && (
            <p className="text-[11px] text-slate-300 text-center py-4 italic">Aucune demande</p>
          )}
        </div>
      )}
    </Droppable>
  </div>
);

// ─── Main KanbanView ─────────────────────────────────────────────────────────
interface KanbanViewProps {
  offers: Offer[];
  onStatusChange: (offerId: string, newStatus: string, reason?: string) => void;
  callbackOfferIds?: Set<string>;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  offers,
  onStatusChange,
  callbackOfferIds = new Set(),
}) => {
  const { navigateToAdmin } = useRoleNavigation();

  // Group offers by column — ignore offers in terminal/unlisted statuses
  const columnOffers = useMemo(() => {
    const map: Record<string, Offer[]> = {};
    KANBAN_COLUMNS.forEach((c) => (map[c.id] = []));
    offers.forEach((o) => {
      const status = o.workflow_status ?? "draft";
      if (COLUMN_IDS.has(status)) {
        map[status].push({ ...o, has_callback: callbackOfferIds.has(o.id) });
      }
    });
    return map;
  }, [offers, callbackOfferIds]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const offer = offers.find((o) => o.id === draggableId);
    if (!offer) return;

    onStatusChange(draggableId, destination.droppableId, "Déplacé via Kanban");
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            offers={columnOffers[col.id] ?? []}
            onNavigate={(id) => navigateToAdmin(`offers/${id}`)}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanView;

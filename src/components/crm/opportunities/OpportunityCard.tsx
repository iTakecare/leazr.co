import React from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Phone,
  Mail,
  MessageSquare,
  CalendarClock,
  AlertTriangle,
  Bot,
  Linkedin,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CrmChannel, OpportunityWithRelations } from '@/services/crm/types';

const CHANNEL_ICONS: Record<CrmChannel, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  meeting: CalendarClock,
  linkedin: Linkedin,
  voice_ai: Bot,
  other: Circle,
};

interface Props {
  opportunity: OpportunityWithRelations;
  onClick?: () => void;
  isDragging?: boolean;
  /** Affiche le libellé d'étape — utile en vue liste, redondant en kanban. */
  showStage?: boolean;
}

const OpportunityCard: React.FC<Props> = ({ opportunity, onClick, isDragging, showStage }) => {
  const nextAt = opportunity.next_action_at ? parseISO(opportunity.next_action_at) : null;
  const overdue = nextAt ? isPast(nextAt) && !isToday(nextAt) : false;
  const dueToday = nextAt ? isToday(nextAt) : false;
  const ChannelIcon = opportunity.next_action_channel
    ? CHANNEL_ICONS[opportunity.next_action_channel]
    : null;

  const ownerInitials = opportunity.owner
    ? `${opportunity.owner.first_name?.[0] ?? ''}${opportunity.owner.last_name?.[0] ?? ''}`.toUpperCase() || null
    : null;

  const company = opportunity.client?.company || opportunity.client?.name;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-md border bg-white px-2.5 py-2 shadow-sm transition-all',
        'hover:border-primary/40 hover:shadow',
        isDragging && 'rotate-1 shadow-lg ring-2 ring-primary/30',
        overdue && 'border-l-[3px] border-l-red-500'
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[13px] font-medium leading-tight text-slate-900">
          {opportunity.name}
        </p>
        {ownerInitials && (
          <span
            className="shrink-0 text-[10px] font-semibold tracking-wide text-slate-400"
            title={`${opportunity.owner?.first_name ?? ''} ${opportunity.owner?.last_name ?? ''}`.trim()}
          >
            {ownerInitials}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] text-slate-500">{company || '—'}</span>
        {opportunity.estimated_monthly_payment != null && (
          <span className="shrink-0 text-[11px] font-semibold text-slate-700">
            {opportunity.estimated_monthly_payment.toLocaleString('fr-BE', {
              maximumFractionDigits: 0,
            })}{' '}
            €
          </span>
        )}
      </div>

      {showStage && opportunity.stage && (
        <span
          className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: `${opportunity.stage.color}1a`, color: opportunity.stage.color }}
        >
          {opportunity.stage.label}
        </span>
      )}

      {nextAt && (
        <div
          className={cn(
            'mt-1.5 flex items-center gap-1 text-[10px]',
            overdue && 'font-medium text-red-600',
            dueToday && 'font-medium text-amber-600',
            !overdue && !dueToday && 'text-slate-400'
          )}
        >
          {overdue ? (
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          ) : ChannelIcon ? (
            <ChannelIcon className="h-2.5 w-2.5 shrink-0" />
          ) : (
            <CalendarClock className="h-2.5 w-2.5 shrink-0" />
          )}
          <span className="truncate">
            {format(nextAt, 'd MMM', { locale: fr })}
            {opportunity.next_action_note ? ` · ${opportunity.next_action_note}` : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default OpportunityCard;

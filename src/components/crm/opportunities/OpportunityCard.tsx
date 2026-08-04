import React from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Phone,
  Mail,
  MessageSquare,
  CalendarClock,
  Building2,
  Euro,
  AlertTriangle,
  Bot,
  Linkedin,
  Circle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
}

const OpportunityCard: React.FC<Props> = ({ opportunity, onClick, isDragging }) => {
  const nextAt = opportunity.next_action_at ? parseISO(opportunity.next_action_at) : null;
  const overdue = nextAt ? isPast(nextAt) && !isToday(nextAt) : false;
  const dueToday = nextAt ? isToday(nextAt) : false;
  const ChannelIcon = opportunity.next_action_channel
    ? CHANNEL_ICONS[opportunity.next_action_channel]
    : null;

  const ownerInitials = opportunity.owner
    ? `${opportunity.owner.first_name?.[0] ?? ''}${opportunity.owner.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-all',
        'hover:border-primary/40 hover:shadow-md',
        isDragging && 'rotate-1 shadow-lg ring-2 ring-primary/30',
        overdue && 'border-l-4 border-l-red-500'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-900">
          {opportunity.name}
        </p>
        {ownerInitials && (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600"
            title={`${opportunity.owner?.first_name ?? ''} ${opportunity.owner?.last_name ?? ''}`.trim()}
          >
            {ownerInitials}
          </span>
        )}
      </div>

      {opportunity.client?.name && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{opportunity.client.company || opportunity.client.name}</span>
        </p>
      )}

      {opportunity.estimated_monthly_payment != null && (
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
          <Euro className="h-3 w-3" />
          {opportunity.estimated_monthly_payment.toLocaleString('fr-BE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{' '}
          <span className="font-normal text-slate-400">/ mois</span>
        </p>
      )}

      {nextAt && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px]',
            overdue && 'bg-red-50 font-medium text-red-700',
            dueToday && 'bg-amber-50 font-medium text-amber-700',
            !overdue && !dueToday && 'bg-slate-50 text-slate-500'
          )}
        >
          {overdue ? (
            <AlertTriangle className="h-3 w-3 shrink-0" />
          ) : ChannelIcon ? (
            <ChannelIcon className="h-3 w-3 shrink-0" />
          ) : (
            <CalendarClock className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">
            {opportunity.next_action_note || 'Prochaine action'} ·{' '}
            {format(nextAt, 'd MMM', { locale: fr })}
          </span>
        </div>
      )}

      {opportunity.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {opportunity.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpportunityCard;

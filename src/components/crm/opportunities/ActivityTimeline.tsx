import React, { useMemo } from 'react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Phone,
  Mail,
  MessageSquare,
  CalendarClock,
  StickyNote,
  CheckSquare,
  ArrowRightLeft,
  FileText,
  Bot,
  Repeat,
  Settings,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVITY_LABELS, type CrmActivity, type CrmActivityType } from '@/services/crm/types';

const ICONS: Record<CrmActivityType, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  meeting: CalendarClock,
  note: StickyNote,
  task: CheckSquare,
  stage_change: ArrowRightLeft,
  document: FileText,
  voice_ai: Bot,
  sequence: Repeat,
  system: Settings,
};

const COLORS: Record<CrmActivityType, string> = {
  call: 'bg-blue-100 text-blue-600',
  email: 'bg-indigo-100 text-indigo-600',
  whatsapp: 'bg-emerald-100 text-emerald-600',
  sms: 'bg-teal-100 text-teal-600',
  meeting: 'bg-purple-100 text-purple-600',
  note: 'bg-amber-100 text-amber-600',
  task: 'bg-sky-100 text-sky-600',
  stage_change: 'bg-slate-100 text-slate-600',
  document: 'bg-orange-100 text-orange-600',
  voice_ai: 'bg-violet-100 text-violet-600',
  sequence: 'bg-pink-100 text-pink-600',
  system: 'bg-slate-100 text-slate-500',
};

const dayLabel = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'EEEE d MMMM yyyy', { locale: fr });
};

interface Props {
  activities: CrmActivity[];
  loading?: boolean;
  emptyLabel?: string;
}

const ActivityTimeline: React.FC<Props> = ({ activities, loading, emptyLabel }) => {
  const grouped = useMemo(() => {
    const map = new Map<string, CrmActivity[]>();
    activities.forEach((a) => {
      const key = a.occurred_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [activities]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyLabel ?? 'Aucune interaction enregistrée pour le moment.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([day, items]) => (
        <div key={day}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {dayLabel(parseISO(day))}
          </p>

          <div className="relative space-y-3 border-l border-slate-200 pl-5">
            {items.map((activity) => {
              const Icon = ICONS[activity.type] ?? Settings;
              return (
                <div key={activity.id} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white',
                      COLORS[activity.type] ?? COLORS.system
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>

                  <div className="rounded-lg border bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {ACTIVITY_LABELS[activity.type] ?? activity.type}
                      </span>
                      {activity.direction === 'in' && (
                        <ArrowDownLeft className="h-3 w-3 text-emerald-500" title="Entrant" />
                      )}
                      {activity.direction === 'out' && (
                        <ArrowUpRight className="h-3 w-3 text-blue-500" title="Sortant" />
                      )}
                      <span>·</span>
                      <span>{format(parseISO(activity.occurred_at), 'HH:mm')}</span>
                      <span>·</span>
                      <span>{activity.actor_name ?? 'Système'}</span>
                      {activity.outcome && (
                        <>
                          <span>·</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                            {activity.outcome}
                          </span>
                        </>
                      )}
                    </div>

                    {activity.subject && (
                      <p className="mt-1 text-sm font-medium text-slate-800">{activity.subject}</p>
                    )}
                    {activity.body && (
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">
                        {activity.body.length > 600
                          ? `${activity.body.slice(0, 600)}…`
                          : activity.body}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;

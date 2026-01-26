import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StickyNote, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { NoteItem } from '@/services/commercialDashboardService';
import { Link, useLocation } from 'react-router-dom';

interface RecentNotesCardProps {
  notes: NoteItem[];
  isLoading: boolean;
}

const getNoteTypeStyle = (type: string): string => {
  const styles: Record<string, string> = {
    'admin_note': 'bg-purple-100 text-purple-700',
    'internal_note': 'bg-slate-100 text-slate-700',
    'client_note': 'bg-blue-100 text-blue-700'
  };
  return styles[type] || 'bg-slate-100 text-slate-600';
};

const getNoteTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'admin_note': 'Admin',
    'internal_note': 'Interne',
    'client_note': 'Client'
  };
  return labels[type] || type;
};

export const RecentNotesCard = ({ notes, isLoading }: RecentNotesCardProps) => {
  const location = useLocation();
  const companySlug = location.pathname.split('/')[1];

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-slate-500" />
            Notes Récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50">
                <div className="h-4 bg-slate-100 animate-pulse rounded w-full mb-2" />
                <div className="h-3 bg-slate-100 animate-pulse rounded w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-slate-500" />
          Notes Récentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune note récente
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {notes.map((note) => (
              <Link
                key={note.id}
                to={`/${companySlug}${note.link}`}
                className="block p-3 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {note.client_name}
                  </span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded shrink-0",
                    getNoteTypeStyle(note.note_type)
                  )}>
                    {getNoteTypeLabel(note.note_type)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-1">
                  {note.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </span>
                  <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentNotesCard;

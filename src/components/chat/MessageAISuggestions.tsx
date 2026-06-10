import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Link2, FileCheck, ListTodo, MessageSquareReply, UserSearch, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ChatConversation } from '@/types/chat';

// Suggestions de l'assistant IA (messaging-ai) pour une conversation —
// pattern Capptain : l'IA propose, l'humain valide. Les suggestions
// arrivent en realtime (analyse auto à chaque message entrant) et chaque
// acceptation s'exécute côté client avec les droits de l'utilisateur.
export interface AISuggestion {
  id: string;
  kind: 'link_offer' | 'identify_client' | 'task' | 'classify_document' | 'reply';
  payload: Record<string, unknown>;
  reason: string | null;
  status: string;
}

const KIND_META: Record<AISuggestion['kind'], { icon: React.ElementType; label: (p: Record<string, unknown>) => string }> = {
  link_offer: { icon: Link2, label: (p) => `Lier à la demande ${p.offer_label ?? ''}` },
  identify_client: { icon: UserSearch, label: (p) => `Client probable : ${p.suggested_name}` },
  task: { icon: ListTodo, label: (p) => `Créer la tâche « ${p.title} »` },
  classify_document: { icon: FileCheck, label: (p) => `Classer la pièce jointe comme « ${p.document_type} »` },
  reply: { icon: MessageSquareReply, label: () => 'Brouillon de réponse proposé' },
};

interface Props {
  conversation: ChatConversation;
  companyId: string;
  onPrefillReply: (body: string) => void;
  onAssociateClient: (prefillSearch: string) => void;
  onConversationPatched: (patch: Partial<ChatConversation>) => void;
}

export const MessageAISuggestions: React.FC<Props> = ({
  conversation,
  companyId,
  onPrefillReply,
  onAssociateClient,
  onConversationPatched,
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('message_ai_suggestions')
      .select('id, kind, payload, reason, status')
      .eq('conversation_id', conversation.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setSuggestions((data ?? []) as AISuggestion[]);
  }, [conversation.id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`ai_suggestions_${conversation.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_ai_suggestions',
        filter: `conversation_id=eq.${conversation.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation.id, load]);

  const resolve = async (id: string, status: 'accepted' | 'dismissed') => {
    await supabase
      .from('message_ai_suggestions')
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
      .eq('id', id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const accept = async (s: AISuggestion) => {
    setBusyId(s.id);
    try {
      switch (s.kind) {
        case 'link_offer': {
          const { error } = await supabase
            .from('chat_conversations')
            .update({ offer_id: s.payload.offer_id })
            .eq('id', conversation.id);
          if (error) throw error;
          onConversationPatched({ offer_id: s.payload.offer_id as string } as Partial<ChatConversation>);
          toast.success(`Conversation liée à la demande ${s.payload.offer_label ?? ''}`);
          break;
        }
        case 'identify_client': {
          onAssociateClient(String(s.payload.suggested_name ?? ''));
          break;
        }
        case 'task': {
          const due = new Date();
          due.setDate(due.getDate() + (Number(s.payload.due_in_days) || 3));
          const { error } = await supabase.from('tasks').insert({
            company_id: companyId,
            title: String(s.payload.title ?? 'Suivi messagerie'),
            description: (s.payload.description as string) || null,
            due_date: due.toISOString(),
            priority: ['low', 'medium', 'high'].includes(String(s.payload.priority)) ? String(s.payload.priority) : 'medium',
            status: 'todo',
            related_client_id: conversation.client_id ?? null,
            related_offer_id: (conversation as { offer_id?: string | null }).offer_id ?? null,
            created_by: user?.id ?? null,
          });
          if (error) throw error;
          toast.success('Tâche créée dans la todolist');
          break;
        }
        case 'classify_document': {
          const offerId = (conversation as { offer_id?: string | null }).offer_id;
          if (!offerId) {
            toast.error('Liez d\'abord la conversation à une demande pour classer le document.');
            setBusyId(null);
            return;
          }
          const { data, error } = await supabase.functions.invoke('messaging-ai', {
            body: {
              action: 'classify_document',
              payload: { message_id: s.payload.message_id, offer_id: offerId, document_type: s.payload.document_type },
            },
          });
          const r = (data ?? null) as { success?: boolean; message?: string } | null;
          if (error || !r?.success) throw new Error(r?.message ?? 'classement échoué');
          toast.success('Document classé dans le dossier de la demande');
          break;
        }
        case 'reply': {
          onPrefillReply(String(s.payload.body ?? ''));
          break;
        }
      }
      await resolve(s.id, 'accepted');
    } catch (e) {
      console.error('[MessageAISuggestions] accept failed:', e);
      toast.error(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const reanalyze = async () => {
    setAnalyzing(true);
    try {
      await supabase.functions.invoke('messaging-ai', {
        body: { action: 'analyze_conversation', conversation_id: conversation.id },
      });
      await load();
    } catch (e) {
      console.error('[MessageAISuggestions] analyze failed:', e);
      toast.error("L'analyse IA a échoué");
    } finally {
      setAnalyzing(false);
    }
  };

  // Pas de suggestions sur le chat web (l'IA n'analyse que WhatsApp/SMS).
  if (conversation.channel !== 'whatsapp' && conversation.channel !== 'sms') return null;

  return (
    <div className="border-t bg-violet-50/50 px-4 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-violet-700 inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Assistant IA
        </span>
        <Button size="sm" variant="ghost" className="h-6 text-xs text-violet-700" onClick={reanalyze} disabled={analyzing}>
          {analyzing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Analyser
        </Button>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-xs text-muted-foreground pb-1">Aucune suggestion en attente.</p>
      ) : (
        <div className="space-y-1.5 pb-1">
          {suggestions.map((s) => {
            const meta = KIND_META[s.kind];
            const Icon = meta.icon;
            return (
              <div key={s.id} className="flex items-start gap-2 bg-white rounded-lg border border-violet-100 px-3 py-2">
                <Icon className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight">{meta.label(s.payload)}</p>
                  {s.reason && <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.reason}</p>}
                  {s.kind === 'reply' && (
                    <p className="text-xs italic text-muted-foreground mt-1 line-clamp-2">« {String(s.payload.body)} »</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" className="h-7 px-2" onClick={() => accept(s)} disabled={busyId === s.id}>
                    {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => resolve(s.id, 'dismissed')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

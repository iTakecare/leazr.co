import React, { useState, useEffect, useRef } from "react";
import { fetchComments, addComment, createTaskNotification, fetchCompanyProfiles, type TaskComment } from "@/services/taskService";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface TaskCommentsProps {
  taskId: string;
}

const TaskComments = ({ taskId }: TaskCommentsProps) => {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [content, setContent] = useState('');
  const [profiles, setProfiles] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments(taskId).then(setComments);
  }, [taskId]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyProfiles(companyId).then(setProfiles);
    }
  }, [companyId]);

  const handleContentChange = (val: string) => {
    setContent(val);
    // Detect @ mention
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ') || afterAt.split(' ').length <= 2) {
        setMentionFilter(afterAt.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (profile: typeof profiles[0]) => {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const lastAt = content.lastIndexOf('@');
    const newContent = content.slice(0, lastAt) + `@${name} `;
    setContent(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSending(true);
    const comment = await addComment(taskId, user.id, content.trim());
    setComments(prev => [...prev, comment]);

    // Detect mentions and notify
    const mentionRegex = /@(\S+ \S+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1].toLowerCase();
      const mentionedProfile = profiles.find(p => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
        return fullName === mentionedName;
      });
      if (mentionedProfile && mentionedProfile.id !== user.id) {
        const userName = user.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : user.email || 'Quelqu\'un';
        await createTaskNotification(
          taskId,
          mentionedProfile.id,
          'comment',
          `${userName} vous a mentionné dans un commentaire`
        );
      }
    }

    setContent('');
    setSending(false);
  };

  const filteredProfiles = profiles.filter(p => {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
    return name.includes(mentionFilter);
  });

  return (
    <div className="space-y-3">
      <Label>Commentaires ({comments.length})</Label>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {comments.map((c) => {
          const name = c.user ? `${c.user.first_name || ''} ${c.user.last_name || ''}`.trim() : 'Inconnu';
          const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={c.user?.avatar_url || ''} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Ajouter un commentaire... (@ pour mentionner)"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={2}
          className="text-sm pr-10"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1 bottom-1 h-7 w-7"
          onClick={handleSubmit}
          disabled={sending || !content.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>

        {showMentions && filteredProfiles.length > 0 && (
          <div className="absolute bottom-full mb-1 w-full bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto z-50">
            {filteredProfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                onClick={() => insertMention(p)}
              >
                {`${p.first_name || ''} ${p.last_name || ''}`.trim()}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskComments;

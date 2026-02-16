import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fetchCompanyTags, createTag, assignTagToTask, removeTagFromTask, fetchTaskTagIds,
  type TaskTag
} from "@/services/taskService";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface TaskTagManagerProps {
  taskId: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const TaskTagManager = ({ taskId }: TaskTagManagerProps) => {
  const { companyId } = useMultiTenant();
  const [allTags, setAllTags] = useState<TaskTag[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!companyId) return;
    const [tags, ids] = await Promise.all([
      fetchCompanyTags(companyId),
      fetchTaskTagIds(taskId),
    ]);
    setAllTags(tags);
    setAssignedTagIds(ids);
  };

  useEffect(() => { load(); }, [taskId, companyId]);

  const handleToggleTag = async (tagId: string) => {
    if (assignedTagIds.includes(tagId)) {
      await removeTagFromTask(taskId, tagId);
      setAssignedTagIds(prev => prev.filter(id => id !== tagId));
    } else {
      await assignTagToTask(taskId, tagId);
      setAssignedTagIds(prev => [...prev, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!companyId || !newTagName.trim()) return;
    const tag = await createTag(companyId, newTagName.trim(), newTagColor);
    setAllTags(prev => [...prev, tag]);
    await assignTagToTask(taskId, tag.id);
    setAssignedTagIds(prev => [...prev, tag.id]);
    setNewTagName('');
    setShowCreate(false);
  };

  const assignedTags = allTags.filter(t => assignedTagIds.includes(t.id));
  const unassignedTags = allTags.filter(t => !assignedTagIds.includes(t.id));

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-1">
        {assignedTags.map((tag) => (
          <Badge
            key={tag.id}
            className="text-[11px] cursor-pointer gap-1"
            style={{ backgroundColor: tag.color, color: 'white' }}
            onClick={() => handleToggleTag(tag.id)}
          >
            {tag.name}
            <X className="h-3 w-3" />
          </Badge>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" /> Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            {unassignedTags.length > 0 && (
              <div className="space-y-1 mb-2">
                {unassignedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm rounded hover:bg-muted"
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {showCreate ? (
              <div className="space-y-2 border-t pt-2">
                <Input
                  placeholder="Nom du tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTag())}
                />
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-5 h-5 rounded-full border-2 ${newTagColor === c ? 'border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewTagColor(c)}
                    />
                  ))}
                </div>
                <Button type="button" size="sm" className="w-full h-7 text-xs" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                  Créer
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs border-t mt-1"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Nouveau tag
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TaskTagManager;

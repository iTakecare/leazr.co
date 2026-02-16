import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { fetchSubtasks, addSubtask, toggleSubtask, deleteSubtask, type TaskSubtask } from "@/services/taskService";
import { Label } from "@/components/ui/label";

interface TaskSubtasksProps {
  taskId: string;
}

const TaskSubtasks = ({ taskId }: TaskSubtasksProps) => {
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await fetchSubtasks(taskId);
    setSubtasks(data);
  };

  useEffect(() => {
    load();
  }, [taskId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    await addSubtask(taskId, newTitle.trim(), subtasks.length);
    setNewTitle('');
    await load();
    setLoading(false);
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleSubtask(id, !current);
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, is_completed: !current } : s));
  };

  const handleDelete = async (id: string) => {
    await deleteSubtask(id);
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const completed = subtasks.filter(s => s.is_completed).length;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        Sous-tâches
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground">({completed}/{subtasks.length})</span>
        )}
      </Label>

      {subtasks.length > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${subtasks.length > 0 ? (completed / subtasks.length) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((s) => (
          <div key={s.id} className="flex items-center gap-2 group">
            <Checkbox
              checked={s.is_completed}
              onCheckedChange={() => handleToggle(s.id, s.is_completed)}
            />
            <span className={`flex-1 text-sm ${s.is_completed ? 'line-through text-muted-foreground' : ''}`}>
              {s.title}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => handleDelete(s.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nouvelle sous-tâche..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          className="h-8 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAdd} disabled={loading || !newTitle.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default TaskSubtasks;

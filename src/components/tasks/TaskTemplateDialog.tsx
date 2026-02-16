import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText } from "lucide-react";
import { fetchTemplates, createTemplate, deleteTemplate, type TaskTemplate, type TaskPriority } from "@/services/taskService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface TaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (template: TaskTemplate) => void;
}

const TaskTemplateDialog = ({ open, onOpenChange, onApplyTemplate }: TaskTemplateDialogProps) => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [mode, setMode] = useState<'list' | 'create'>('list');

  // Create form
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (open && companyId) {
      fetchTemplates(companyId).then(setTemplates);
      setMode('list');
    }
  }, [open, companyId]);

  const handleCreate = async () => {
    if (!companyId || !user || !name.trim() || !title.trim()) return;
    await createTemplate({
      company_id: companyId,
      name: name.trim(),
      title: title.trim(),
      description: description.trim() || null,
      priority,
      subtasks: subtasks.map(s => ({ title: s })),
      tags: [],
      created_by: user.id,
    });
    toast.success("Modèle créé");
    const updated = await fetchTemplates(companyId);
    setTemplates(updated);
    setMode('list');
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success("Modèle supprimé");
  };

  const resetForm = () => {
    setName('');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSubtasks([]);
    setNewSubtask('');
  };

  const addSubtaskItem = () => {
    if (newSubtask.trim()) {
      setSubtasks(prev => [...prev, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'list' ? 'Modèles de tâches' : 'Nouveau modèle'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'list' ? (
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun modèle</p>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.title}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onApplyTemplate(t); onOpenChange(false); }}>
                    Utiliser
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              <Button type="button" onClick={() => setMode('create')}>
                <Plus className="h-4 w-4 mr-1" /> Créer un modèle
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Nom du modèle *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vérification documents" />
            </div>
            <div>
              <Label>Titre de tâche par défaut *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sous-tâches prédéfinies</Label>
              {subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                  <span className="flex-1 text-sm">{s}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSubtasks(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Ajouter une sous-tâche..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtaskItem())}
                />
                <Button type="button" size="sm" variant="outline" onClick={addSubtaskItem}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMode('list')}>Retour</Button>
              <Button type="button" onClick={handleCreate} disabled={!name.trim() || !title.trim()}>Créer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskTemplateDialog;

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyProfiles } from "@/hooks/useTasks";
import { Task, CreateTaskInput, TaskPriority } from "@/services/taskService";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSubmit: (data: Omit<CreateTaskInput, 'company_id' | 'created_by'>) => void;
}

const TaskDialog = ({ open, onOpenChange, task, onSubmit }: TaskDialogProps) => {
  const { data: profiles = [] } = useCompanyProfiles();
  const { companyId } = useMultiTenant();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [relatedClientId, setRelatedClientId] = useState<string>('');
  const [relatedContractId, setRelatedContractId] = useState<string>('');
  const [relatedOfferId, setRelatedOfferId] = useState<string>('');

  // Fetch clients
  useEffect(() => {
    if (!companyId || !open) return;
    supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name')
      .limit(200)
      .then(({ data }) => setClients(data || []));
  }, [companyId, open]);

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setAssignedTo(task.assigned_to || '');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setRelatedClientId(task.related_client_id || '');
      setRelatedContractId(task.related_contract_id || '');
      setRelatedOfferId(task.related_offer_id || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAssignedTo('');
      setDueDate('');
      setRelatedClientId('');
      setRelatedContractId('');
      setRelatedOfferId('');
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigned_to: assignedTo || undefined,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      related_client_id: relatedClientId || undefined,
      related_contract_id: relatedContractId || undefined,
      related_offer_id: relatedOfferId || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="due_date">Échéance</Label>
              <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Assigné à</Label>
            <Select value={assignedTo || 'none'} onValueChange={(v) => setAssignedTo(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assigné</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lier à un client</Label>
            <Select value={relatedClientId || 'none'} onValueChange={(v) => setRelatedClientId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={!title.trim()}>
              {task ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;

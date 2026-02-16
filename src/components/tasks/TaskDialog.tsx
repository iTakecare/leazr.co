import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyProfiles } from "@/hooks/useTasks";
import { Task, CreateTaskInput, TaskPriority, RecurrenceType, fetchClientContracts, fetchClientOffers } from "@/services/taskService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import ClientSearchInput from "./ClientSearchInput";
import TaskSubtasks from "./TaskSubtasks";
import TaskTagManager from "./TaskTagManager";
import TaskComments from "./TaskComments";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSubmit: (data: Omit<CreateTaskInput, 'company_id' | 'created_by'>) => void;
}

const TaskDialog = ({ open, onOpenChange, task, onSubmit }: TaskDialogProps) => {
  const { data: profiles = [] } = useCompanyProfiles();
  const { companyId } = useMultiTenant();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [relatedClientId, setRelatedClientId] = useState<string>('');
  const [relatedContractId, setRelatedContractId] = useState<string>('');
  const [relatedOfferId, setRelatedOfferId] = useState<string>('');
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Client dossiers
  const [contracts, setContracts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);

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
      setRecurrenceType(task.recurrence_type || 'none');
      setRecurrenceEndDate(task.recurrence_end_date ? task.recurrence_end_date.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAssignedTo('');
      setDueDate('');
      setRelatedClientId('');
      setRelatedContractId('');
      setRelatedOfferId('');
      setRecurrenceType('none');
      setRecurrenceEndDate('');
      setContracts([]);
      setOffers([]);
    }
  }, [task, open]);

  // Load client dossiers when client changes
  useEffect(() => {
    if (relatedClientId) {
      Promise.all([
        fetchClientContracts(relatedClientId),
        fetchClientOffers(relatedClientId),
      ]).then(([c, o]) => {
        setContracts(c);
        setOffers(o);
      });
    } else {
      setContracts([]);
      setOffers([]);
      setRelatedContractId('');
      setRelatedOfferId('');
    }
  }, [relatedClientId]);

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
      recurrence_type: recurrenceType !== 'none' ? recurrenceType as RecurrenceType : undefined,
      recurrence_end_date: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="task-form">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="details" disabled={!task}>Détails</TabsTrigger>
                <TabsTrigger value="comments" disabled={!task}>Commentaires</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
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

                {/* Client search with autocomplete */}
                <ClientSearchInput
                  value={relatedClientId}
                  onChange={(clientId) => setRelatedClientId(clientId)}
                />

                {/* Dynamic contract/offer selectors */}
                {relatedClientId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Contrat lié</Label>
                      <Select value={relatedContractId || 'none'} onValueChange={(v) => setRelatedContractId(v === 'none' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {contracts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.client_name || c.id.slice(0, 8)} {c.status ? `(${c.status})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Offre/Demande liée</Label>
                      <Select value={relatedOfferId || 'none'} onValueChange={(v) => setRelatedOfferId(v === 'none' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {offers.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.equipment_description?.slice(0, 40) || o.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Recurrence */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Récurrence</Label>
                    <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        <SelectItem value="daily">Quotidienne</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {recurrenceType !== 'none' && (
                    <div>
                      <Label>Fin de récurrence</Label>
                      <Input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                {task && (
                  <>
                    <TaskSubtasks taskId={task.id} />
                    <TaskTagManager taskId={task.id} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                {task && <TaskComments taskId={task.id} />}
              </TabsContent>
            </Tabs>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="task-form" disabled={!title.trim()}>
            {task ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;

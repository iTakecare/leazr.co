import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Timeline, TimelineItem, TimelineItemContent, TimelineItemIndicator, TimelineItemTitle } from "@/components/ui/timeline";
import { User, Mail, Phone, Tag, Package, Plus, X, History, Pencil, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type EquipmentItem, type EquipmentAssignmentHistory, collaboratorEquipmentService } from "@/services/collaboratorEquipmentService";

interface CollaboratorDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail: string;
  equipment: EquipmentItem[];
  onUpdate?: () => void;
}

const CollaboratorDetailModal: React.FC<CollaboratorDetailModalProps> = ({
  open,
  onOpenChange,
  collaboratorId,
  collaboratorName,
  collaboratorEmail,
  equipment,
  onUpdate
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(collaboratorName);
  const [editEmail, setEditEmail] = useState(collaboratorEmail || '');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<EquipmentAssignmentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && collaboratorId && collaboratorId !== 'unassigned') {
      loadCollaboratorDetails();
      loadHistory();
    }
  }, [open, collaboratorId]);

  const loadCollaboratorDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('name, email, phone, role, tags')
        .eq('id', collaboratorId)
        .single();
      
      if (error) throw error;
      if (data) {
        setEditName(data.name);
        setEditEmail(data.email || '');
        setEditPhone(data.phone || '');
        setEditRole(data.role || '');
        setTags(Array.isArray(data.tags) ? (data.tags as string[]) : []);
      }
    } catch (e) {
      console.error('Erreur chargement collaborateur:', e);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      // Get history for all equipment of this collaborator
      const allHistory: EquipmentAssignmentHistory[] = [];
      for (const item of equipment) {
        try {
          const h = await collaboratorEquipmentService.getEquipmentAssignmentHistory(item.id, item.equipment_type);
          allHistory.push(...h);
        } catch {
          // ignore individual errors
        }
      }
      // Sort by date desc
      allHistory.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
      setHistory(allHistory);
    } catch (e) {
      console.error('Erreur chargement historique:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) return;
    
    const updated = [...tags, tag];
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ tags: updated } as any)
        .eq('id', collaboratorId);
      if (error) throw error;
      setTags(updated);
      setNewTag('');
      toast.success(`Tag "${tag}" ajouté`);
    } catch (e) {
      toast.error('Erreur lors de l\'ajout du tag');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    const updated = tags.filter(t => t !== tag);
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ tags: updated } as any)
        .eq('id', collaboratorId);
      if (error) throw error;
      setTags(updated);
      toast.success(`Tag "${tag}" supprimé`);
    } catch (e) {
      toast.error('Erreur lors de la suppression du tag');
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({
          name: editName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          role: editRole.trim() || 'Collaborateur',
        })
        .eq('id', collaboratorId);
      if (error) throw error;
      toast.success('Collaborateur mis à jour');
      setEditing(false);
      onUpdate?.();
    } catch (e) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const displayName = collaboratorName && collaboratorName.trim() && !/^\d+$/.test(collaboratorName.trim())
    ? collaboratorName
    : collaboratorEmail || 'Collaborateur sans nom';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Info Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Informations</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="h-7 text-xs gap-1">
                <Pencil className="h-3 w-3" />
                {editing ? 'Annuler' : 'Modifier'}
              </Button>
            </div>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nom</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 text-sm" type="email" />
                  </div>
                  <div>
                    <Label className="text-xs">Téléphone</Label>
                    <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Rôle</Label>
                  <Input value={editRole} onChange={e => setEditRole(e.target.value)} className="h-8 text-sm" />
                </div>
                <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Enregistrer
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {collaboratorEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{collaboratorEmail}</span>
                  </div>
                )}
                {editPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{editPhone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.length > 0 ? tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:bg-destructive/20 rounded-full p-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              )) : (
                <p className="text-xs text-muted-foreground">Aucun tag</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Nouveau tag..."
                className="h-7 text-xs"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button onClick={handleAddTag} size="sm" variant="outline" className="h-7 text-xs gap-1 px-2">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Equipment */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Équipements assignés ({equipment.length})
            </h4>
            {equipment.length > 0 ? (
              <div className="space-y-2">
                {equipment.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-md border bg-muted/30">
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.source_name}</p>
                    </div>
                    {item.serial_number && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.serial_number}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun équipement assigné</p>
            )}
          </div>

          <Separator />

          {/* History */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique des assignations
            </h4>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : history.length > 0 ? (
              <Timeline>
                {history.slice(0, 10).map(entry => (
                  <TimelineItem key={entry.id}>
                    <TimelineItemIndicator active={!entry.unassigned_at} />
                    <TimelineItemContent>
                      <TimelineItemTitle>
                        {entry.unassigned_at
                          ? `Retiré le ${formatDate(entry.unassigned_at)}`
                          : `Assigné le ${formatDate(entry.assigned_at)}`
                        }
                      </TimelineItemTitle>
                      <p className="text-xs text-muted-foreground">
                        {entry.notes || 'Aucune note'}
                      </p>
                    </TimelineItemContent>
                  </TimelineItem>
                ))}
              </Timeline>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun historique disponible</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollaboratorDetailModal;

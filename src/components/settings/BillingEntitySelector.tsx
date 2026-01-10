import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Building2, CalendarIcon, Loader2 } from 'lucide-react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// BillingEntity interface is exported below with the props

export interface BillingEntity {
  id: string;
  company_id: string;
  name: string;
  legal_form: string | null;
  vat_number: string | null;
  partner_id: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  valid_from: string;
  valid_until: string | null;
  is_default: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface BillingEntitySelectorProps {
  companyId: string;
  selectedEntityId: string | null;
  onEntitySelect: (entityId: string | null) => void;
  onEntityChange?: (entity: BillingEntity | null) => void;
}

const emptyEntity = {
  name: '',
  legal_form: 'societe',
  vat_number: '',
  partner_id: '',
  address: '',
  city: '',
  postal_code: '',
  country: 'Belgique',
  valid_from: new Date(),
  valid_until: null as Date | null,
  is_default: false
};

const BillingEntitySelector: React.FC<BillingEntitySelectorProps> = ({
  companyId,
  selectedEntityId,
  onEntitySelect,
  onEntityChange
}) => {
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<BillingEntity | null>(null);
  const [editingEntity, setEditingEntity] = useState<BillingEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyEntity);

  const createEntityFromCompanyData = async () => {
    try {
      // Fetch company data to create initial entity
      const { data: companyData, error: companyError } = await supabase
        .from('company_customizations')
        .select('company_name, company_vat_number, company_address, company_city, company_postal_code, company_country, company_legal_form')
        .eq('company_id', companyId)
        .single();

      if (companyError || !companyData) {
        // Fallback to companies table
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .single();
        
        if (fallbackError || !fallbackData) return null;
        
        const newEntity = {
          company_id: companyId,
          name: fallbackData.name,
          legal_form: 'societe',
          valid_from: '2023-01-01',
          is_default: true,
          country: 'Belgique'
        };

        const { data: createdEntity, error: createError } = await supabase
          .from('billing_entities')
          .insert(newEntity)
          .select()
          .single();

        if (createError) throw createError;
        return createdEntity;
      }

      const newEntity = {
        company_id: companyId,
        name: companyData.company_name || 'Entité par défaut',
        legal_form: companyData.company_legal_form || 'societe',
        vat_number: companyData.company_vat_number || null,
        address: companyData.company_address || null,
        city: companyData.company_city || null,
        postal_code: companyData.company_postal_code || null,
        country: companyData.company_country || 'Belgique',
        valid_from: '2023-01-01',
        is_default: true
      };

      const { data: createdEntity, error: createError } = await supabase
        .from('billing_entities')
        .insert(newEntity)
        .select()
        .single();

      if (createError) throw createError;
      
      toast.success("Entité de facturation créée automatiquement à partir des données de l'entreprise");
      return createdEntity;
    } catch (err) {
      console.error('Error creating entity from company data:', err);
      return null;
    }
  };

  const fetchEntities = async () => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      let { data, error } = await supabase
        .from('billing_entities')
        .select('*')
        .eq('company_id', companyId)
        .order('valid_from', { ascending: false });

      if (error) throw error;
      
      // If no entities exist, create one from company data
      if (!data || data.length === 0) {
        const newEntity = await createEntityFromCompanyData();
        if (newEntity) {
          data = [newEntity];
        }
      }
      
      setEntities(data || []);
      
      // Auto-select default entity if none selected
      if (!selectedEntityId && data && data.length > 0) {
        const defaultEntity = data.find(e => e.is_default);
        if (defaultEntity) {
          onEntitySelect(defaultEntity.id);
          onEntityChange?.(defaultEntity);
        } else {
          // Select first entity if no default
          onEntitySelect(data[0].id);
          onEntityChange?.(data[0]);
        }
      } else if (selectedEntityId && data) {
        // Notify parent of current entity data
        const currentEntity = data.find(e => e.id === selectedEntityId);
        if (currentEntity) {
          onEntityChange?.(currentEntity);
        }
      }
    } catch (err) {
      console.error('Error fetching billing entities:', err);
      toast.error("Erreur lors du chargement des entités de facturation");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [companyId]);

  const handleOpenCreate = () => {
    setEditingEntity(null);
    setFormData(emptyEntity);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (entity: BillingEntity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      legal_form: entity.legal_form || 'societe',
      vat_number: entity.vat_number || '',
      partner_id: entity.partner_id || '',
      address: entity.address || '',
      city: entity.city || '',
      postal_code: entity.postal_code || '',
      country: entity.country || 'Belgique',
      valid_from: entity.valid_from ? parseISO(entity.valid_from) : new Date(),
      valid_until: entity.valid_until ? parseISO(entity.valid_until) : null,
      is_default: entity.is_default || false
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom de l'entité est obligatoire");
      return;
    }

    try {
      setIsSaving(true);

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from('billing_entities')
          .update({ is_default: false })
          .eq('company_id', companyId);
      }

      const entityData = {
        company_id: companyId,
        name: formData.name.trim(),
        legal_form: formData.legal_form,
        vat_number: formData.vat_number?.trim() || null,
        partner_id: formData.partner_id?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        postal_code: formData.postal_code?.trim() || null,
        country: formData.country?.trim() || null,
        valid_from: format(formData.valid_from, 'yyyy-MM-dd'),
        valid_until: formData.valid_until ? format(formData.valid_until, 'yyyy-MM-dd') : null,
        is_default: formData.is_default
      };

      if (editingEntity) {
        const { error } = await supabase
          .from('billing_entities')
          .update(entityData)
          .eq('id', editingEntity.id);
        
        if (error) throw error;
        toast.success("Entité de facturation mise à jour");
      } else {
        const { data, error } = await supabase
          .from('billing_entities')
          .insert(entityData)
          .select()
          .single();
        
        if (error) throw error;
        toast.success("Entité de facturation créée");
        
        // Auto-select new entity
        if (data) {
          onEntitySelect(data.id);
          onEntityChange?.(data);
        }
      }

      setIsDialogOpen(false);
      await fetchEntities();
      
      // After save, notify parent of updated entity
      if (editingEntity) {
        const updatedEntities = await supabase
          .from('billing_entities')
          .select('*')
          .eq('id', editingEntity.id)
          .single();
        if (updatedEntities.data) {
          onEntityChange?.(updatedEntities.data);
        }
      }
    } catch (err) {
      console.error('Error saving billing entity:', err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entityToDelete) return;

    try {
      const { error } = await supabase
        .from('billing_entities')
        .delete()
        .eq('id', entityToDelete.id);

      if (error) throw error;

      toast.success("Entité de facturation supprimée");
      
      if (selectedEntityId === entityToDelete.id) {
        onEntitySelect(null);
        onEntityChange?.(null);
      }
      
      setIsDeleteDialogOpen(false);
      setEntityToDelete(null);
      fetchEntities();
    } catch (err) {
      console.error('Error deleting billing entity:', err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const isEntityExpired = (entity: BillingEntity) => {
    if (!entity.valid_until) return false;
    return isBefore(parseISO(entity.valid_until), new Date());
  };

  const getEntityLabel = (entity: BillingEntity) => {
    const parts = [entity.name];
    if (entity.vat_number) {
      parts.push(`(${entity.vat_number})`);
    }
    return parts.join(' ');
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">Entité de facturation</span>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedEntityId || ''}
          onValueChange={(value) => {
            onEntitySelect(value || null);
            const entity = entities.find(e => e.id === value) || null;
            onEntityChange?.(entity);
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner une entité..."} />
          </SelectTrigger>
          <SelectContent>
            {entities.map((entity) => (
              <SelectItem key={entity.id} value={entity.id}>
                <div className="flex items-center gap-2">
                  <span>{getEntityLabel(entity)}</span>
                  {entity.legal_form === 'personne_physique' && (
                    <Badge variant="outline" className="text-xs">Indépendant</Badge>
                  )}
                  {entity.legal_form === 'societe' && (
                    <Badge variant="secondary" className="text-xs">Société</Badge>
                  )}
                  {isEntityExpired(entity) && (
                    <Badge variant="destructive" className="text-xs">Expirée</Badge>
                  )}
                  {entity.is_default && (
                    <Badge className="text-xs">Par défaut</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={handleOpenCreate} title="Nouvelle entité">
          <Plus className="h-4 w-4" />
        </Button>

        {selectedEntity && (
          <>
            <Button variant="outline" size="icon" onClick={() => handleOpenEdit(selectedEntity)} title="Modifier">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => { setEntityToDelete(selectedEntity); setIsDeleteDialogOpen(true); }}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Selected entity details */}
      {selectedEntity && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {selectedEntity.partner_id && (
              <span>Partner ID: <strong>{selectedEntity.partner_id}</strong></span>
            )}
            <span>
              Valide depuis: <strong>{format(parseISO(selectedEntity.valid_from), 'dd/MM/yyyy', { locale: fr })}</strong>
              {selectedEntity.valid_until && (
                <> → <strong>{format(parseISO(selectedEntity.valid_until), 'dd/MM/yyyy', { locale: fr })}</strong></>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? "Modifier l'entité" : "Nouvelle entité de facturation"}
            </DialogTitle>
            <DialogDescription>
              Une entité de facturation représente une structure juridique (personne physique ou société) utilisée pour la facturation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-name">Nom de l'entité *</Label>
                <Input
                  id="entity-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: iTakecare SRL"
                />
              </div>

              <div className="space-y-2">
                <Label>Forme juridique</Label>
                <Select
                  value={formData.legal_form}
                  onValueChange={(value) => setFormData({ ...formData, legal_form: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personne_physique">Personne physique (Indépendant)</SelectItem>
                    <SelectItem value="societe">Société</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-vat">N° TVA</Label>
                <Input
                  id="entity-vat"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  placeholder="BE0XXX.XXX.XXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-partner">Partner ID (Grenke)</Label>
                <Input
                  id="entity-partner"
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  placeholder="Ex: GR-12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-address">Adresse</Label>
              <Input
                id="entity-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rue et numéro"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-postal">Code postal</Label>
                <Input
                  id="entity-postal"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-city">Ville</Label>
                <Input
                  id="entity-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Bruxelles"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-country">Pays</Label>
                <Input
                  id="entity-country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Belgique"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début de validité *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.valid_from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_from ? format(formData.valid_from, 'dd/MM/yyyy', { locale: fr }) : "Sélectionner..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.valid_from}
                      onSelect={(date) => date && setFormData({ ...formData, valid_from: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Date de fin de validité</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.valid_until && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_until ? format(formData.valid_until, 'dd/MM/yyyy', { locale: fr }) : "Non définie"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.valid_until || undefined}
                      onSelect={(date) => setFormData({ ...formData, valid_until: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="entity-default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: !!checked })}
              />
              <Label htmlFor="entity-default" className="text-sm font-normal">
                Définir comme entité par défaut
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEntity ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entité ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'entité "{entityToDelete?.name}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingEntitySelector;

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { CreateWorkflowTemplate, OfferType } from '@/types/workflow';

interface WorkflowTemplateFormProps {
  template?: any;
  onSubmit: (data: CreateWorkflowTemplate) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

export const WorkflowTemplateForm: React.FC<WorkflowTemplateFormProps> = ({
  template,
  onSubmit,
  onCancel,
  isEditMode = false
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateWorkflowTemplate>({
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      offer_type: template?.offer_type || 'ambassador_offer',
      contract_type: template?.contract_type || '',
      is_default: template?.is_default || false
    }
  });

  const watchOfferType = watch('offer_type');

  const offerTypes: { value: OfferType; label: string; description: string }[] = [
    {
      value: 'client_request',
      label: 'Demande Client',
      description: 'Processus pour les demandes directes des clients'
    },
    {
      value: 'web_request',
      label: 'Demande Web - Standard',
      description: 'Processus pour les demandes catalogue du site web'
    },
    {
      value: 'custom_pack_request',
      label: 'Demande Web - Pack Perso',
      description: 'Processus pour les demandes de packs personnalisés du site web'
    },
    {
      value: 'ambassador_offer',
      label: 'Demande Ambassadeur',
      description: 'Workflow avec commission pour ambassadeur'
    }
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du workflow *</Label>
          <Input
            id="name"
            placeholder="Ex: Demande Client Rapide"
            {...register('name', { required: 'Le nom est requis' })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="offer_type">Type d'offre *</Label>
          <Select 
            value={watchOfferType} 
            onValueChange={(value: OfferType) => setValue('offer_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un type" />
            </SelectTrigger>
            <SelectContent>
              {offerTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.offer_type && (
            <p className="text-sm text-destructive">{errors.offer_type.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Décrivez l'objectif et l'utilisation de ce workflow..."
          rows={3}
          {...register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contract_type">Type de contrat (optionnel)</Label>
        <Select 
          onValueChange={(value) => setValue('contract_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez un type de contrat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lease">Location</SelectItem>
            <SelectItem value="purchase">Achat</SelectItem>
            <SelectItem value="rental">Location courte durée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_default"
          onCheckedChange={(checked) => setValue('is_default', checked as boolean)}
        />
        <Label htmlFor="is_default">Définir comme workflow par défaut pour ce type</Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit">
          {isEditMode ? 'Mettre à jour' : 'Créer le workflow'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
};
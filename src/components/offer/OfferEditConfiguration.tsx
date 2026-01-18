import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Edit3, Save, X, Loader2 } from 'lucide-react';
import { translateOfferType } from '@/utils/offerTypeTranslator';
import { useUpdateOfferMutation } from '@/hooks/offers/useOffersQuery';
import { BUSINESS_SECTORS, getBusinessSectorLabel } from '@/constants/businessSectors';
import { useAvailableWorkflows } from '@/hooks/useAvailableWorkflows';

interface OfferEditConfigurationProps {
  offerId: string;
  currentSource?: string;
  currentType?: string;
  currentSector?: string;
  isPurchase?: boolean;
  currentWorkflowId?: string;
  onUpdate?: () => void;
}

const SOURCE_OPTIONS = [
  { value: 'recommendation', label: 'Recommandation' },
  { value: 'google', label: 'Google' },
  { value: 'meta', label: 'Meta (Facebook)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'existing_client', label: 'Client existant' },
  { value: 'website', label: 'Site web' },
  { value: 'event', label: 'Salon/Événement' },
  { value: 'other', label: 'Autre' }
];

const SECTOR_OPTIONS = BUSINESS_SECTORS.map(sector => ({
  value: sector.value,
  label: sector.label
}));

const OfferEditConfiguration: React.FC<OfferEditConfigurationProps> = ({
  offerId,
  currentSource,
  currentType,
  currentSector,
  isPurchase,
  currentWorkflowId,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSource, setSelectedSource] = useState(currentSource || '');
  const [selectedSector, setSelectedSector] = useState(currentSector || '');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(currentWorkflowId || '');
  
  const { mutateAsync: updateOffer, isPending: isUpdating } = useUpdateOfferMutation();
  
  // Filtrer par type d'offre : purchase_request pour achat, sinon tous les workflows
  const filterType = isPurchase ? 'purchase_request' : undefined;
  const { workflows, loading: workflowsLoading } = useAvailableWorkflows(filterType);

  // Mettre à jour selectedWorkflowId quand les workflows sont chargés ou quand currentWorkflowId change
  React.useEffect(() => {
    if (currentWorkflowId) {
      setSelectedWorkflowId(currentWorkflowId);
    } else if (workflows.length > 0 && !selectedWorkflowId) {
      // Fallback: si pas de workflow ID mais workflows chargés, trouver par type
      const match = workflows.find(w => w.offer_type === currentType);
      if (match) {
        setSelectedWorkflowId(match.value);
      }
    }
  }, [workflows, currentType, currentWorkflowId]);

  // Trouver le label du type actuel (basé sur workflow_id ou offer_type)
  const getTypeLabel = (workflowId?: string, offerType?: string) => {
    // D'abord essayer de trouver par workflow ID
    if (workflowId) {
      const workflow = workflows.find(w => w.value === workflowId);
      if (workflow) return workflow.label;
    }
    // Fallback sur offer_type
    const workflowByType = workflows.find(w => w.offer_type === offerType);
    return workflowByType?.label || translateOfferType(offerType || '');
  };

  const handleSave = async () => {
    try {
      const updates: any = {};
      
      if (selectedSource !== currentSource) {
        updates.source = selectedSource;
      }
      
      // Vérifier si le workflow a changé
      if (selectedWorkflowId !== currentWorkflowId) {
        const selectedWorkflow = workflows.find(w => w.value === selectedWorkflowId);
        if (selectedWorkflow) {
          updates.type = selectedWorkflow.offer_type;
          updates.workflow_template_id = selectedWorkflowId;
        }
      }
      
      if (selectedSector !== currentSector) {
        updates.business_sector = selectedSector;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      console.log("📝 Saving updates:", updates);
      await updateOffer({ id: offerId, updates });
      
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('❌ Save failed:', error);
      // Toast géré par la mutation
    }
  };

  const handleCancel = () => {
    setSelectedSource(currentSource || '');
    setSelectedWorkflowId(currentWorkflowId || '');
    setSelectedSector(currentSector || '');
    setIsEditing(false);
  };

  const getSourceLabel = (value: string) => {
    return SOURCE_OPTIONS.find(opt => opt.value === value)?.label || value;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" />
            Détails de l'offre
          </span>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Source */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Source
          </label>
          {isEditing ? (
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div>
              {currentSource ? (
                <Badge variant="secondary">{getSourceLabel(currentSource)}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Non définie</span>
              )}
            </div>
          )}
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Type d'offre
          </label>
          {isEditing ? (
            workflowsLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Chargement...</span>
              </div>
            ) : (
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.value} value={workflow.value}>
                      {workflow.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <div>
              <Badge variant="outline">{getTypeLabel(currentWorkflowId, currentType)}</Badge>
            </div>
          )}
        </div>

        {/* Secteur d'activité */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Secteur d'activité
          </label>
          {isEditing ? (
            <Combobox
              options={SECTOR_OPTIONS}
              value={selectedSector}
              onValueChange={setSelectedSector}
              placeholder="Sélectionner un secteur"
              searchPlaceholder="Rechercher un secteur..."
              emptyMessage="Aucun secteur trouvé."
              className="w-full"
            />
          ) : (
            <div>
              {currentSector ? (
                <Badge variant="secondary">{getBusinessSectorLabel(currentSector)}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Non défini</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
            >
              <Save className="h-4 w-4 mr-1" />
              Sauvegarder
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfferEditConfiguration;
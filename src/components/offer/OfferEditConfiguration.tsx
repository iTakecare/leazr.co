import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Edit3, Save, X } from 'lucide-react';
import { translateOfferType } from '@/utils/offerTypeTranslator';
import { useUpdateOfferMutation } from '@/hooks/offers/useOffersQuery';
import { toast } from 'sonner';
import { BUSINESS_SECTORS, getBusinessSectorLabel } from '@/constants/businessSectors';

interface OfferEditConfigurationProps {
  offerId: string;
  currentSource?: string;
  currentType?: string;
  currentSector?: string;
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

const TYPE_OPTIONS = [
  { value: 'client_request', label: 'Demande client' },
  { value: 'web_request', label: 'Dem. web - standard' },
  { value: 'custom_pack_request', label: 'Dem. web - pack perso' },
  { value: 'ambassador_offer', label: 'Demande ambassadeur' }
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
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSource, setSelectedSource] = useState(currentSource || '');
  const [selectedType, setSelectedType] = useState(currentType || '');
  const [selectedSector, setSelectedSector] = useState(currentSector || '');
  
  const { mutateAsync: updateOffer, isPending: isUpdating } = useUpdateOfferMutation();

  const handleSave = async () => {
    try {
      const updates: any = {};
      
      if (selectedSource !== currentSource) {
        updates.source = selectedSource;
      }
      
      if (selectedType !== currentType) {
        updates.type = selectedType;
      }
      
      if (selectedSector !== currentSector) {
        updates.business_sector = selectedSector;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      await updateOffer({ id: offerId, updates });
      
      toast.success('Configuration mise à jour avec succès');
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleCancel = () => {
    setSelectedSource(currentSource || '');
    setSelectedType(currentType || '');
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
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div>
              <Badge variant="outline">{translateOfferType(currentType)}</Badge>
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
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Euro, Target, Plus, X } from 'lucide-react';
import { OfferFormData } from '@/hooks/useCustomOfferGenerator';

interface BusinessProfileStepProps {
  formData: OfferFormData;
  updateFormData: (section: keyof OfferFormData, data: any) => void;
}

const SECTORS = [
  'Technologie/IT',
  'Conseil/Services',
  'Finance/Banque',
  'Santé/Médical',
  'Éducation/Formation',
  'Commerce/Retail',
  'Industrie/Manufacturing',
  'Communication/Marketing',
  'Architecture/Design',
  'Juridique/Droit',
  'Autre'
];

const WORK_STYLES = [
  { value: 'office', label: 'Bureau (100% présentiel)', icon: '🏢' },
  { value: 'remote', label: 'Télétravail (100% distant)', icon: '🏠' },
  { value: 'hybrid', label: 'Hybride (mixte)', icon: '🔄' }
];

const PRIORITIES = [
  { value: 'performance', label: 'Performance maximale', description: 'Matériel haut de gamme pour des performances optimales' },
  { value: 'mobility', label: 'Mobilité', description: 'Équipements légers et portables pour le travail nomade' },
  { value: 'budget', label: 'Rapport qualité/prix', description: 'Bon équilibre entre performance et coût' }
];

const COMMON_NEEDS = [
  'Adobe Creative Suite',
  'CAD/3D (AutoCAD, SolidWorks)',
  'Développement logiciel',
  'Gaming/Streaming',
  'Travail vidéo/photo',
  'Bureautique avancée',
  'Calculs complexes',
  'Multi-écrans',
  'Mobilité fréquente',
  'Sécurité renforcée'
];

export const BusinessProfileStep: React.FC<BusinessProfileStepProps> = ({
  formData,
  updateFormData
}) => {
  const { businessProfile } = formData;

  const handleChange = (field: string, value: any) => {
    updateFormData('businessProfile', { [field]: value });
  };

  const addSpecificNeed = (need: string) => {
    if (!businessProfile.specificNeeds.includes(need)) {
      handleChange('specificNeeds', [...businessProfile.specificNeeds, need]);
    }
  };

  const removeSpecificNeed = (need: string) => {
    handleChange('specificNeeds', businessProfile.specificNeeds.filter(n => n !== need));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Profil d'Activité
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Aidez-nous à comprendre vos besoins pour des recommandations personnalisées
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Secteur d'activité */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Secteur d'Activité
          </h3>
          <div className="space-y-2">
            <Label htmlFor="sector">Secteur principal *</Label>
            <Select
              value={businessProfile.sector}
              onValueChange={(value) => handleChange('sector', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner votre secteur" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Taille d'équipe et budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Taille d'Équipe
            </h3>
            <div className="space-y-2">
              <Label htmlFor="teamSize">Nombre d'utilisateurs *</Label>
              <Input
                id="teamSize"
                type="number"
                min="1"
                max="1000"
                value={businessProfile.teamSize}
                onChange={(e) => handleChange('teamSize', parseInt(e.target.value) || 1)}
                placeholder="5"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Budget Approximatif
            </h3>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget total (€) *</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="100"
                value={businessProfile.budget}
                onChange={(e) => handleChange('budget', parseFloat(e.target.value) || 0)}
                placeholder="15000"
              />
            </div>
          </div>
        </div>

        {/* Mode de travail */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Mode de Travail
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {WORK_STYLES.map((style) => (
              <Button
                key={style.value}
                variant={businessProfile.workStyle === style.value ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col items-center text-center"
                onClick={() => handleChange('workStyle', style.value)}
              >
                <span className="text-2xl mb-2">{style.icon}</span>
                <span className="text-sm font-medium">{style.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Priorité */}
        <div className="space-y-4">
          <h3 className="font-medium">Priorité Principale</h3>
          <div className="space-y-3">
            {PRIORITIES.map((priority) => (
              <div
                key={priority.value}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  businessProfile.priority === priority.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleChange('priority', priority.value)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                    businessProfile.priority === priority.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {businessProfile.priority === priority.value && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{priority.label}</h4>
                    <p className="text-sm text-muted-foreground">{priority.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Besoins spécifiques */}
        <div className="space-y-4">
          <h3 className="font-medium">Besoins Spécifiques</h3>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les logiciels ou usages importants pour votre activité
          </p>
          
          {/* Besoins sélectionnés */}
          {businessProfile.specificNeeds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {businessProfile.specificNeeds.map((need) => (
                <Badge key={need} variant="secondary" className="flex items-center gap-1">
                  {need}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeSpecificNeed(need)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Besoins communs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {COMMON_NEEDS.filter(need => !businessProfile.specificNeeds.includes(need))
              .map((need) => (
                <Button
                  key={need}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2"
                  onClick={() => addSpecificNeed(need)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {need}
                </Button>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessProfileStep;
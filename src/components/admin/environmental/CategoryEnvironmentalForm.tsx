import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Calculator, AlertTriangle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEnvironmentalData } from "@/hooks/environmental/useEnvironmentalData";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";
import { calculateCO2Equivalents } from "@/utils/co2Utils";

interface CategoryEnvironmentalFormProps {
  categoryId?: string | null;
  onClose: () => void;
}

interface EnvironmentalFormData {
  co2_savings_kg: number;
  carbon_footprint_reduction_percentage: number;
  energy_savings_kwh: number;
  water_savings_liters: number;
  waste_reduction_kg: number;
  source_url: string;
}

const CategoryEnvironmentalForm: React.FC<CategoryEnvironmentalFormProps> = ({ categoryId, onClose }) => {
  const { companySlug } = useCompanyDetection();
  const { data: environmentalData, isLoading } = useEnvironmentalData(companySlug);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<EnvironmentalFormData>({
    co2_savings_kg: 0,
    carbon_footprint_reduction_percentage: 0,
    energy_savings_kwh: 0,
    water_savings_liters: 0,
    waste_reduction_kg: 0,
    source_url: "https://impactco2.fr"
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<string>("default");

  // Find the category data if editing
  const categoryData = categoryId 
    ? environmentalData?.categories?.find(cat => cat.id === categoryId)
    : null;

  const equivalents = calculateCO2Equivalents(formData.co2_savings_kg);

  useEffect(() => {
    if (categoryData?.environmental_impact) {
      const impact = categoryData.environmental_impact;
      setFormData({
        co2_savings_kg: impact.co2_savings_kg || 0,
        carbon_footprint_reduction_percentage: impact.carbon_footprint_reduction_percentage || 0,
        energy_savings_kwh: impact.energy_savings_kwh || 0,
        water_savings_liters: impact.water_savings_liters || 0,
        waste_reduction_kg: impact.waste_reduction_kg || 0,
        source_url: impact.source_url || "https://impactco2.fr"
      });
      
      // Detect source type
      if (impact.source_url?.includes('impactco2')) {
        setSelectedSourceType('default');
      } else if (impact.source_url) {
        setSelectedSourceType('custom');
      }
    }
  }, [categoryData]);

  const handleInputChange = (field: keyof EnvironmentalFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSourceTypeChange = (type: string) => {
    setSelectedSourceType(type);
    if (type === 'default') {
      setFormData(prev => ({ ...prev, source_url: "https://impactco2.fr" }));
    } else if (type === 'ademe') {
      setFormData(prev => ({ ...prev, source_url: "https://bilans-ges.ademe.fr" }));
    }
  };

  const handleSubmit = async () => {
    if (!categoryData && !categoryId) {
      toast({
        title: "Erreur",
        description: "Aucune catégorie sélectionnée",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Here you would call your API to update/create environmental data
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Succès",
        description: `Données environnementales ${categoryId ? 'mises à jour' : 'ajoutées'} avec succès`
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving environmental data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les données",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {categoryId ? 'Modifier' : 'Ajouter'} les données environnementales
          </DialogTitle>
          <DialogDescription>
            {categoryData 
              ? `Configuration des données environnementales pour "${categoryData.translation}"`
              : "Ajouter des données d'impact environnemental pour une catégorie"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Info */}
          {categoryData && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{categoryData.translation}</CardTitle>
                  <Badge variant="secondary">{categoryData.name}</Badge>
                </div>
              </CardHeader>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impact CO2 et Carbone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="co2_savings">Économies CO2 (kg)</Label>
                    <Input
                      id="co2_savings"
                      type="number"
                      step="0.1"
                      value={formData.co2_savings_kg}
                      onChange={(e) => handleInputChange('co2_savings_kg', e.target.value)}
                      placeholder="170"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="carbon_reduction">Réduction empreinte carbone (%)</Label>
                    <Input
                      id="carbon_reduction"
                      type="number"
                      step="0.1"
                      value={formData.carbon_footprint_reduction_percentage}
                      onChange={(e) => handleInputChange('carbon_footprint_reduction_percentage', e.target.value)}
                      placeholder="25"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Autres Impacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="energy_savings">Économies énergie (kWh)</Label>
                    <Input
                      id="energy_savings"
                      type="number"
                      step="0.1"
                      value={formData.energy_savings_kwh}
                      onChange={(e) => handleInputChange('energy_savings_kwh', e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="water_savings">Économies eau (litres)</Label>
                    <Input
                      id="water_savings"
                      type="number"
                      step="0.1"
                      value={formData.water_savings_liters}
                      onChange={(e) => handleInputChange('water_savings_liters', e.target.value)}
                      placeholder="1000"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="waste_reduction">Réduction déchets (kg)</Label>
                    <Input
                      id="waste_reduction"
                      type="number"
                      step="0.1"
                      value={formData.waste_reduction_kg}
                      onChange={(e) => handleInputChange('waste_reduction_kg', e.target.value)}
                      placeholder="50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Source des données</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Type de source</Label>
                    <Select value={selectedSourceType} onValueChange={handleSourceTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type de source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Impact CO2 (défaut)</SelectItem>
                        <SelectItem value="ademe">Base Carbone ADEME</SelectItem>
                        <SelectItem value="custom">Source personnalisée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="source_url">URL de la source</Label>
                    <Input
                      id="source_url"
                      type="url"
                      value={formData.source_url}
                      onChange={(e) => handleInputChange('source_url', e.target.value)}
                      placeholder="https://impactco2.fr"
                      disabled={selectedSourceType === 'default' || selectedSourceType === 'ademe'}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Aperçu des équivalents
                  </CardTitle>
                  <CardDescription>
                    Visualisation de l'impact environnemental calculé
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.co2_savings_kg > 0 ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800 font-medium">
                          🍃 -{formData.co2_savings_kg} kg CO2 économisés
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-800">
                            🚗 Équivaut à {equivalents.carKilometers} km en voiture évités
                          </div>
                        </div>
                        
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <div className="flex items-center gap-2 text-emerald-800">
                            🌳 Équivaut à {equivalents.treeMonths} mois d'absorption par un arbre
                          </div>
                        </div>
                      </div>
                      
                      {formData.energy_savings_kwh > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800">
                            ⚡ {formData.energy_savings_kwh} kWh d'énergie économisés
                          </div>
                        </div>
                      )}
                      
                      {formData.water_savings_liters > 0 && (
                        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                          <div className="flex items-center gap-2 text-cyan-800">
                            💧 {formData.water_savings_liters} litres d'eau économisés
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Aucun impact CO2 configuré</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Source de référence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    <a 
                      href={formData.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {formData.source_url}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryEnvironmentalForm;
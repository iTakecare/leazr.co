import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, Users, Calculator, FileText, TrendingUp, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FleetGeneratorService } from "@/services/fleetGeneratorService";
import type { FleetGenerationRequest, FleetConfiguration } from "@/types/fleetGenerator";

const FleetGenerator = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<FleetGenerationRequest>({
    business_sector: '',
    team_size: 10,
    requirements: {
      performance: 'medium',
      mobility: 'medium',
      graphics: 'medium'
    }
  });
  const [generatedConfig, setGeneratedConfig] = useState<FleetConfiguration | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!request.business_sector) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un secteur d'activité", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const config = await FleetGeneratorService.generateFleetConfiguration(request);
      setGeneratedConfig(config);
      setStep(3);
      toast({ title: "Succès", description: "Configuration générée avec succès!" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de générer la configuration", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Analysons vos besoins</h2>
        <p className="text-muted-foreground">Quelques questions pour optimiser votre parc informatique</p>
      </div>
      
      <div className="grid gap-4">
        <div>
          <Label htmlFor="sector">Secteur d'activité</Label>
          <Select value={request.business_sector} onValueChange={(value) => setRequest({...request, business_sector: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez votre secteur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technology">Technologie / Startup</SelectItem>
              <SelectItem value="office">Services / Bureau</SelectItem>
              <SelectItem value="creative">Créatif / Design</SelectItem>
              <SelectItem value="sales">Commercial / Vente</SelectItem>
              <SelectItem value="customer_service">Support client</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="team_size">Taille de l'équipe</Label>
          <Input
            type="number"
            value={request.team_size}
            onChange={(e) => setRequest({...request, team_size: parseInt(e.target.value) || 1})}
            min="1"
            max="500"
          />
        </div>
        
        <div>
          <Label htmlFor="budget">Budget approximatif (optionnel)</Label>
          <Input
            type="number"
            placeholder="Ex: 25000"
            onChange={(e) => setRequest({...request, budget: parseInt(e.target.value) || undefined})}
          />
        </div>
      </div>
      
      <Button onClick={() => setStep(2)} className="w-full" disabled={!request.business_sector}>
        Continuer <Users className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Précisez vos exigences</h2>
        <p className="text-muted-foreground">Aidez-nous à optimiser les spécifications</p>
      </div>
      
      <div className="grid gap-6">
        <div>
          <Label>Niveau de performance requis</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <Button
                key={level}
                variant={request.requirements.performance === level ? "default" : "outline"}
                onClick={() => setRequest({
                  ...request,
                  requirements: {...request.requirements, performance: level}
                })}
              >
                {level === 'low' ? 'Basique' : level === 'medium' ? 'Standard' : 'Haute'}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <Label>Besoins en mobilité</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <Button
                key={level}
                variant={request.requirements.mobility === level ? "default" : "outline"}
                onClick={() => setRequest({
                  ...request,
                  requirements: {...request.requirements, mobility: level}
                })}
              >
                {level === 'low' ? 'Sédentaire' : level === 'medium' ? 'Mixte' : 'Nomade'}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <Label>Exigences graphiques</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <Button
                key={level}
                variant={request.requirements.graphics === level ? "default" : "outline"}
                onClick={() => setRequest({
                  ...request,
                  requirements: {...request.requirements, graphics: level}
                })}
              >
                {level === 'low' ? 'Bureautique' : level === 'medium' ? 'Multimédia' : 'Pro/Gaming'}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
          Retour
        </Button>
        <Button onClick={handleGenerate} className="flex-1" disabled={loading}>
          {loading ? "Génération..." : "Générer"} <Zap className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configuration générée</h2>
        <p className="text-muted-foreground">Voici notre recommandation optimisée</p>
      </div>
      
      {generatedConfig && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Résumé financier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Coût total</p>
                  <p className="text-2xl font-bold">{generatedConfig.total_cost.toLocaleString()}€</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mensuel (leasing)</p>
                  <p className="text-2xl font-bold">{generatedConfig.monthly_cost.toLocaleString()}€</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Score d'optimisation: {generatedConfig.optimization_score}%</Badge>
                  <Badge>{generatedConfig.equipment_list.length} équipements</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Équipements recommandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {generatedConfig.equipment_list.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <div>
                      <p className="font-medium">{item.quantity}x {item.type}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge variant={item.condition === 'new' ? 'default' : 'secondary'}>
                      {item.condition === 'new' ? 'Neuf' : 'Reconditionné'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
          Nouvelle config
        </Button>
        <Button className="flex-1">
          <FileText className="mr-2 h-4 w-4" />
          Exporter PDF
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Générateur de Parc</h1>
          <p className="text-lg text-muted-foreground">
            Intelligence artificielle pour optimiser votre parc informatique
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i}
                </div>
              ))}
            </div>
            <div className="text-center">
              <CardTitle>
                {step === 1 ? 'Besoins' : step === 2 ? 'Exigences' : 'Résultat'}
              </CardTitle>
              <CardDescription>
                Étape {step} sur 3
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FleetGenerator;
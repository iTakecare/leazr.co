import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Container from "@/components/layout/Container";
import { Mail, Lock, User, Building, Loader2, Check, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { createCompanyWithAdmin, getAvailableModules, PLANS } from "@/services/companyService";

const SaaSSignupPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    companyName: "",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
    plan: "pro",
    selectedModules: [] as string[]
  });

  const [availableModules, setAvailableModules] = useState<any[]>([]);

  React.useEffect(() => {
    const loadModules = async () => {
      const modules = await getAvailableModules();
      setAvailableModules(modules);
      // Pre-select core modules
      const coreModules = modules.filter(m => m.is_core).map(m => m.slug);
      setFormData(prev => ({ ...prev, selectedModules: coreModules }));
    };
    loadModules();
  }, []);

  const handleModuleToggle = (moduleSlug: string, checked: boolean) => {
    const module = availableModules.find(m => m.slug === moduleSlug);
    if (module?.is_core) return; // Cannot toggle core modules

    setFormData(prev => ({
      ...prev,
      selectedModules: checked 
        ? [...prev.selectedModules, moduleSlug]
        : prev.selectedModules.filter(m => m !== moduleSlug)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.companyName || !formData.adminEmail || !formData.adminPassword || 
        !formData.adminFirstName || !formData.adminLastName) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCompanyWithAdmin({
        companyName: formData.companyName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName,
        plan: formData.plan,
        selectedModules: formData.selectedModules
      });

      if (result.success) {
        toast.success("Inscription réussie ! Vérifiez votre email pour activer votre compte.");
        navigate('/trial/confirm-email');
      } else {
        toast.error(result.error || "Erreur lors de l'inscription");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error("Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card className="w-full max-w-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Commencez votre essai gratuit</CardTitle>
        <CardDescription>
          Créez votre compte et découvrez Leazr pendant 14 jours sans engagement
        </CardDescription>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">14 jours gratuits • Sans carte bancaire</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="adminFirstName">Prénom *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="adminFirstName"
                placeholder="Jean"
                value={formData.adminFirstName}
                onChange={(e) => setFormData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminLastName">Nom *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="adminLastName"
                placeholder="Dupont"
                value={formData.adminLastName}
                onChange={(e) => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Nom de l'entreprise *</Label>
          <div className="relative">
            <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="companyName"
              placeholder="Ma Société de Leasing"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminEmail">Email professionnel *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@monentreprise.com"
              value={formData.adminEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminPassword">Mot de passe *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="adminPassword"
              type="password"
              placeholder="••••••••"
              value={formData.adminPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
              className="pl-10"
              required
              minLength={6}
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
        </div>

        <Button 
          onClick={() => setCurrentStep(2)}
          className="w-full"
          size="lg"
        >
          Continuer
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          En continuant, vous acceptez nos conditions d'utilisation
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="w-full max-w-4xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Choisissez votre configuration</CardTitle>
        <CardDescription>
          Sélectionnez le plan et les modules adaptés à vos besoins
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Plan Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Plan d'abonnement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PLANS).map(([planKey, plan]) => (
              <div
                key={planKey}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  formData.plan === planKey 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.popular ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, plan: planKey }))}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Populaire
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h4 className="font-bold text-lg">{plan.name}</h4>
                  <div className="text-2xl font-bold text-primary my-2">
                    {plan.price}€<span className="text-sm text-muted-foreground">/mois</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  
                  <ul className="text-sm space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modules Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Modules disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableModules.map((module) => (
              <div
                key={module.slug}
                className={`border rounded-lg p-4 ${
                  module.is_core ? 'bg-primary/5 border-primary/20' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{module.name}</h4>
                      {module.is_core && (
                        <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                          Inclus
                        </span>
                      )}
                    </div>
                    {module.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {module.description}
                      </p>
                    )}
                    {module.price && !module.is_core && (
                      <p className="text-sm font-medium text-primary">
                        +{module.price}€/mois
                      </p>
                    )}
                  </div>
                  
                  <Checkbox
                    checked={formData.selectedModules.includes(module.slug)}
                    onCheckedChange={(checked) => handleModuleToggle(module.slug, checked as boolean)}
                    disabled={module.is_core}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Button 
            onClick={() => setCurrentStep(1)}
            variant="outline"
            className="flex-1"
          >
            Retour
          </Button>
          <Button 
            onClick={() => setCurrentStep(3)}
            className="flex-1"
          >
            Continuer
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => {
    const selectedPlan = PLANS[formData.plan as keyof typeof PLANS];
    const selectedModulesData = availableModules.filter(m => 
      formData.selectedModules.includes(m.slug)
    );
    
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Récapitulatif de votre essai</CardTitle>
          <CardDescription>
            Vérifiez vos informations avant de finaliser votre inscription
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Trial Banner */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800 mb-2">
                🎉 Essai gratuit de 14 jours
              </div>
              <p className="text-sm text-gray-600">
                Aucun paiement requis • Annulation possible à tout moment
              </p>
            </div>
          </div>

          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="font-semibold border-b pb-2">Informations entreprise</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Entreprise:</span>
                <p className="font-medium">{formData.companyName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Administrateur:</span>
                <p className="font-medium">{formData.adminFirstName} {formData.adminLastName}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{formData.adminEmail}</p>
              </div>
            </div>
          </div>

          {/* Plan Info */}
          <div className="space-y-3">
            <h3 className="font-semibold border-b pb-2">Plan sélectionné</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{selectedPlan?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedPlan?.description}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{selectedPlan?.price}€/mois</p>
                <p className="text-xs text-green-600">Gratuit pendant l'essai</p>
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-3">
            <h3 className="font-semibold border-b pb-2">Modules inclus</h3>
            <div className="grid grid-cols-1 gap-2">
              {selectedModulesData.map((module) => (
                <div key={module.slug} className="flex justify-between items-center text-sm">
                  <span>{module.name}</span>
                  <span className="text-muted-foreground">
                    {module.is_core ? 'Inclus' : `+${module.price || 0}€/mois`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Prochaines étapes :</strong> Vous recevrez un email de confirmation pour activer votre compte. 
              Une fois activé, vous aurez accès à toutes les fonctionnalités pendant 14 jours.
            </p>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={() => setCurrentStep(2)}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Modifier
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Démarrer mon essai gratuit"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container className="flex items-center justify-center min-h-screen py-8">
      <div className="w-full">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`
                    w-16 h-1 ml-4
                    ${currentStep > step ? 'bg-primary' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex justify-center">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </div>
    </Container>
  );
};

export default SaaSSignupPage;
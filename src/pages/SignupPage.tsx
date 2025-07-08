import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAvailableModules, createCompanyWithAdmin, PLANS, calculatePrice, type Module } from '@/services/companyService';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    companyName: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    plan: 'pro',
    selectedModules: [] as string[]
  });

  useEffect(() => {
    const loadModules = async () => {
      const modulesList = await getAvailableModules();
      setModules(modulesList);
      
      // Pré-sélectionner les modules core
      const coreModules = modulesList.filter(m => m.is_core).map(m => m.slug);
      setFormData(prev => ({ ...prev, selectedModules: coreModules }));
    };
    
    loadModules();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModuleToggle = (moduleSlug: string, isCore: boolean) => {
    if (isCore) return; // Les modules core ne peuvent pas être désactivés
    
    setFormData(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleSlug)
        ? prev.selectedModules.filter(m => m !== moduleSlug)
        : [...prev.selectedModules, moduleSlug]
    }));
  };

  const handlePlanChange = (plan: string) => {
    setFormData(prev => ({ ...prev, plan }));
  };

  const validateStep1 = () => {
    if (!formData.companyName || !formData.adminFirstName || !formData.adminLastName || 
        !formData.adminEmail || !formData.adminPassword || !formData.confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return false;
    }
    
    // Validation email plus stricte
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      toast.error('Veuillez saisir une adresse email valide');
      return false;
    }
    
    // Vérifier que l'email ne contient pas de caractères invalides
    if (formData.adminEmail.includes(' ') || formData.adminEmail.length > 254) {
      toast.error('Format d\'email invalide');
      return false;
    }
    
    if (formData.adminPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return false;
    }
    
    if (formData.adminPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    const planConfig = PLANS[formData.plan];
    if (planConfig.modules_limit !== -1 && formData.selectedModules.length > planConfig.modules_limit) {
      toast.error(`Le plan ${planConfig.name} limite à ${planConfig.modules_limit} modules`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    setLoading(true);
    console.log('Début de la création du compte...');
    
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

      console.log('Résultat de la création:', result);

      if (result.success) {
        toast.success('Votre compte a été créé avec succès !');
        console.log('Redirection vers le tableau de bord...');
        
        // Rediriger vers le dashboard - l'essai est activé automatiquement
        window.location.href = '/dashboard';
      } else {
        console.error('Échec de la création:', result.error);
        toast.error(result.error || 'Erreur lors de la création du compte');
      }
    } catch (error) {
      console.error('Erreur dans handleSubmit:', error);
      toast.error('Erreur lors de la création du compte. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const selectedModulesData = modules.filter(m => formData.selectedModules.includes(m.slug));
  const totalPrice = calculatePrice(formData.plan, selectedModulesData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step > 1 ? 'Retour' : 'Accueil'}
          </Button>
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              L
            </div>
            <span className="text-2xl font-bold text-gray-900">Leazr</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Créer votre compte
          </h1>
          <p className="text-gray-600">
            Étape {step} sur 3
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {i < step ? <CheckCircle className="h-5 w-5" /> : i}
                </div>
                {i < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    i < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Company & Admin Info */}
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Informations de votre entreprise</CardTitle>
              <CardDescription>
                Créons votre compte administrateur et votre espace entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Nom de l'entreprise *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Mon Entreprise"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adminFirstName">Prénom *</Label>
                      <Input
                        id="adminFirstName"
                        value={formData.adminFirstName}
                        onChange={(e) => handleInputChange('adminFirstName', e.target.value)}
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminLastName">Nom *</Label>
                      <Input
                        id="adminLastName"
                        value={formData.adminLastName}
                        onChange={(e) => handleInputChange('adminLastName', e.target.value)}
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adminEmail">Email administrateur *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                      placeholder="admin@monentreprise.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPassword">Mot de passe *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleNext} className="w-full">
                Continuer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Plan & Modules */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Plans */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Choisissez votre plan</CardTitle>
                <CardDescription>
                  Sélectionnez le plan qui correspond à vos besoins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {Object.entries(PLANS).map(([key, plan]) => (
                    <div
                      key={key}
                      className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                        formData.plan === key
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePlanChange(key)}
                    >
                      {plan.popular && (
                        <Badge className="mb-3 bg-blue-600">Populaire</Badge>
                      )}
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {plan.price}€<span className="text-lg text-gray-600">/mois</span>
                      </div>
                      <p className="text-gray-600 mb-4">{plan.description}</p>
                      <ul className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Modules */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Modules disponibles</CardTitle>
                <CardDescription>
                  Sélectionnez les modules dont vous avez besoin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className={`border rounded-lg p-4 ${
                        module.is_core ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={formData.selectedModules.includes(module.slug)}
                          onCheckedChange={() => handleModuleToggle(module.slug, module.is_core)}
                          disabled={module.is_core}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{module.name}</h4>
                            {module.is_core && (
                              <Badge variant="secondary" className="text-xs">
                                Inclus
                              </Badge>
                            )}
                          </div>
                          {module.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {module.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button onClick={handleNext}>
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Récapitulatif de votre commande</CardTitle>
              <CardDescription>
                Vérifiez vos informations avant de finaliser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-4">Informations entreprise</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Entreprise:</span> {formData.companyName}</p>
                    <p><span className="font-medium">Administrateur:</span> {formData.adminFirstName} {formData.adminLastName}</p>
                    <p><span className="font-medium">Email:</span> {formData.adminEmail}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-4">Abonnement</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Plan:</span> {PLANS[formData.plan].name}</p>
                    <p><span className="font-medium">Modules sélectionnés:</span> {formData.selectedModules.length}</p>
                    <div className="text-2xl font-bold text-blue-600 mt-4">
                      {totalPrice}€<span className="text-lg text-gray-600">/mois</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Modules inclus:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedModulesData.map((module) => (
                    <div key={module.id} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{module.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SignupPage;

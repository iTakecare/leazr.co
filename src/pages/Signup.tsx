
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PersonalInfoStep } from "@/components/signup/PersonalInfoStep";
import { ModuleSelectionStep } from "@/components/signup/ModuleSelectionStep";
import { CompanyInfoStep } from "@/components/signup/CompanyInfoStep";
import { StepperProgress } from "@/components/signup/StepperProgress";

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_core: boolean;
}

const Signup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("admin");
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>(['crm', 'catalog', 'calculator']);
  const navigate = useNavigate();

  const stepLabels = ["Informations", "Modules", "Entreprise"];
  const totalSteps = 3;

  // Load modules on component mount
  useEffect(() => {
    const loadModules = async () => {
      try {
        const { data, error } = await supabase
          .from('modules')
          .select('*')
          .order('name');
        
        if (error) {
          console.error("Error loading modules:", error);
          return;
        }
        
        setModules(data || []);
        
        // Auto-select core modules
        const coreModules = (data || []).filter(m => m.is_core).map(m => m.slug);
        setSelectedModules([...coreModules]);
      } catch (error) {
        console.error("Error loading modules:", error);
      }
    };
    
    loadModules();
  }, []);

  useEffect(() => {
    const checkExistingClient = async () => {
      if (email) {
        try {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('email', email)
            .single();
          
          if (error && error.code !== 'PGRST116') {
            console.error("Error checking client:", error);
            return;
          }
          
          if (data) {
            setIsExistingClient(true);
            setClientInfo(data);
            
            // Auto-populate fields from client data
            if (!firstName && data.name) {
              const nameParts = data.name.split(' ');
              setFirstName(nameParts[0] || '');
              setLastName(nameParts.slice(1).join(' ') || '');
            }
            
            if (!company && data.company) {
              setCompany(data.company);
            }
          } else {
            setIsExistingClient(false);
            setClientInfo(null);
          }
        } catch (error) {
          console.error("Error checking client:", error);
        }
      }
    };
    
    const debounce = setTimeout(() => {
      if (email) {
        checkExistingClient();
      }
    }, 500);
    
    return () => clearTimeout(debounce);
  }, [email]);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedFromStep1 = () => {
    return firstName.trim() && lastName.trim() && email.trim() && password.length >= 6;
  };

  const canProceedFromStep2 = () => {
    return selectedModules.length > 0;
  };

  const canProceedFromStep3 = () => {
    return company.trim() && role;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canProceedFromStep3()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Création d\'un essai gratuit de 14 jours...');
      
      const { data, error } = await supabase.functions.invoke('create-prospect', {
        body: {
          email: email,
          firstName: firstName,
          lastName: lastName,
          companyName: company.trim(),
          plan: 'starter',
          selectedModules: selectedModules
        }
      });
      
      if (error) {
        console.error("Erreur lors de la création du prospect:", error);
        toast.error(`Erreur d'inscription: ${error.message}`);
        return;
      }
      
      if (data && data.success) {
        console.log('Prospect créé avec succès:', data);
        toast.success("Essai gratuit de 14 jours créé avec succès! Vérifiez votre email pour activer votre compte.");
        
        // Rediriger vers une page d'activation avec le token
        navigate(`/activate?token=${data.activationToken}&email=${encodeURIComponent(email)}`);
      } else {
        throw new Error(data?.error || 'Erreur inconnue lors de la création');
      }
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      toast.error(`Erreur: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            isExistingClient={isExistingClient}
          />
        );
      case 2:
        return (
          <ModuleSelectionStep
            modules={modules}
            selectedModules={selectedModules}
            setSelectedModules={setSelectedModules}
          />
        );
      case 3:
        return (
          <CompanyInfoStep
            company={company}
            setCompany={setCompany}
            role={role}
            setRole={setRole}
            isExistingClient={isExistingClient}
            clientInfo={clientInfo}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-5rem)] py-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            Démarrer votre essai gratuit
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            14 jours d'accès complet - Aucun engagement
          </p>
        </CardHeader>
        
        <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => e.preventDefault()}>
          <CardContent className="px-8">
            <StepperProgress 
              currentStep={currentStep} 
              totalSteps={totalSteps} 
              stepLabels={stepLabels} 
            />
            
            <div className="min-h-[400px]">
              {renderStepContent()}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between px-8 pb-8">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !canProceedFromStep1()) ||
                    (currentStep === 2 && !canProceedFromStep2())
                  }
                  className="flex items-center gap-2"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !canProceedFromStep3()}
                  className="flex items-center gap-2 min-w-[200px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Démarrage de l'essai...
                    </>
                  ) : (
                    "🚀 Démarrer l'essai gratuit"
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </form>

        <div className="text-center pb-6">
          <div className="text-sm text-muted-foreground">
            Déjà un compte?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </Card>
    </Container>
  );
};

export default Signup;

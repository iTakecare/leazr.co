
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useCart } from "@/context/CartContext";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

// Schéma de validation pour le formulaire d'inscription
const registrationSchema = z.object({
  company_number: z.string().min(3, "Le numéro d'entreprise est requis"),
  company_name: z.string().min(2, "Le nom de l'entreprise est requis"),
  first_name: z.string().min(2, "Le prénom est requis"),
  last_name: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirm_password: z.string()
}).refine(data => data.password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"]
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const RegistrationPage = () => {
  const navigate = useNavigate();
  const { items } = useCart();
  
  // État pour le suivi des étapes
  const [step, setStep] = useState<number>(1);
  
  // État pour les données du formulaire
  const [formData, setFormData] = useState<Partial<RegistrationForm>>({});
  
  // État pour les erreurs de validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Gérer les changements de champ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  // Valider et passer à l'étape suivante
  const handleNextStep = () => {
    if (step === 1) {
      try {
        // Valider seulement le numéro d'entreprise pour la première étape
        z.object({
          company_number: z.string().min(3, "Le numéro d'entreprise est requis")
        }).parse(formData);
        
        setStep(2);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach(err => {
            if (err.path) {
              fieldErrors[err.path[0]] = err.message;
            }
          });
          setErrors(fieldErrors);
        }
      }
    } else if (step === 2) {
      try {
        // Valider le formulaire complet
        registrationSchema.parse(formData);
        
        // Simuler l'inscription réussie
        toast.success("Inscription réussie!");
        setTimeout(() => {
          navigate("/confirmation");
        }, 1000);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach(err => {
            if (err.path) {
              fieldErrors[err.path[0]] = err.message;
            }
          });
          setErrors(fieldErrors);
        }
      }
    }
  };
  
  // Revenir à l'étape précédente
  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate("/panier");
    }
  };
  
  // Si le panier est vide, rediriger vers le catalogue
  if (items.length === 0) {
    navigate("/catalogue");
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handlePreviousStep}
            className="flex items-center text-gray-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? "Retour au panier" : "Étape précédente"}
          </Button>
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center ${
                step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {step > 1 ? <CheckCircle className="h-5 w-5" /> : "1"}
              </div>
              <div className={`ml-2 font-medium ${step >= 1 ? "text-indigo-600" : "text-gray-500"}`}>
                Entreprise
              </div>
            </div>
            
            <div className="w-20 h-1 bg-gray-200">
              <div className={`h-full ${step >= 2 ? "bg-indigo-600" : "bg-gray-200"}`} style={{ width: step >= 2 ? "100%" : "0%" }}></div>
            </div>
            
            <div className="flex items-center">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center ${
                step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                2
              </div>
              <div className={`ml-2 font-medium ${step >= 2 ? "text-indigo-600" : "text-gray-500"}`}>
                Information
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-bold mb-6">
              {step === 1 ? "Identifiez votre entreprise" : "Complétez vos informations"}
            </h1>
            
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="company_number">Numéro d'entreprise</Label>
                  <Input
                    id="company_number"
                    name="company_number"
                    value={formData.company_number || ""}
                    onChange={handleChange}
                    className={errors.company_number ? "border-red-500" : ""}
                    placeholder="BE0123.456.789"
                  />
                  {errors.company_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.company_number}</p>
                  )}
                  <p className="text-gray-600 text-sm mt-1">
                    Votre numéro d'entreprise nous permet de vérifier l'éligibilité au leasing
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleNextStep}>
                    Continuer
                  </Button>
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Nom de l'entreprise</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      value={formData.company_name || ""}
                      onChange={handleChange}
                      className={errors.company_name ? "border-red-500" : ""}
                      placeholder="Votre entreprise"
                    />
                    {errors.company_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="company_number">Numéro d'entreprise</Label>
                    <Input
                      id="company_number"
                      name="company_number"
                      value={formData.company_number || ""}
                      onChange={handleChange}
                      className={errors.company_number ? "border-red-500" : ""}
                      placeholder="BE0123.456.789"
                      disabled
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name || ""}
                      onChange={handleChange}
                      className={errors.first_name ? "border-red-500" : ""}
                      placeholder="Votre prénom"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="last_name">Nom</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name || ""}
                      onChange={handleChange}
                      className={errors.last_name ? "border-red-500" : ""}
                      placeholder="Votre nom"
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email professionnel</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      className={errors.email ? "border-red-500" : ""}
                      placeholder="votre-email@entreprise.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone || ""}
                      onChange={handleChange}
                      className={errors.phone ? "border-red-500" : ""}
                      placeholder="+32 123 45 67 89"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password || ""}
                      onChange={handleChange}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      value={formData.confirm_password || ""}
                      onChange={handleChange}
                      className={errors.confirm_password ? "border-red-500" : ""}
                    />
                    {errors.confirm_password && (
                      <p className="text-red-500 text-sm mt-1">{errors.confirm_password}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleNextStep}>
                    Créer un compte
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mt-4 text-center">
            En créant un compte, vous acceptez nos conditions générales et notre politique de confidentialité.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;

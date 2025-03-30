
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Container from "@/components/layout/Container";
import { Mail, Lock, User, Building, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PublicHeader from "@/components/catalog/public/PublicHeader";

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const businessInfo = location.state?.businessInfo || JSON.parse(sessionStorage.getItem('businessInfo') || '{}');
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState(businessInfo?.name || businessInfo?.company || "");
  const [businessNumber, setBusinessNumber] = useState(businessInfo?.vat_number || businessInfo?.business_number || "");
  const [role, setRole] = useState<"client" | "partner" | "ambassador" | "admin">("client");
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const { signUp, isLoading } = useAuth();

  useEffect(() => {
    // Afficher un message si nous venons du processus d'inscription avec numéro d'entreprise
    if (businessInfo && Object.keys(businessInfo).length > 0) {
      toast.info("Complétez votre inscription avec les détails de votre entreprise");
    }
  }, [businessInfo]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Mise à jour pour inclure le numéro d'entreprise et les informations provenant du processus d'inscription
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            company,
            business_number: businessNumber,
            role: role
          }
        }
      });
      
      if (error) {
        console.error("Signup error:", error);
        toast.error(`Erreur d'inscription: ${error.message}`);
        return;
      }
      
      if (data) {
        // Nettoyer les données temporaires
        sessionStorage.removeItem('businessInfo');
        
        // Si nous venons du panier, rediriger vers une page de confirmation
        if (location.state?.fromCart) {
          navigate('/request-sent');
        } else {
          toast.success("Compte créé avec succès! Vérifiez votre email pour confirmer votre inscription.");
          navigate('/login');
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  return (
    <>
      <PublicHeader />
      <Container className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-8">
        <div className="w-full max-w-md">
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✓</span>
              <span className="text-gray-600">Numéro d'entreprise</span>
              <span className="flex-1 border-t border-dashed border-gray-300 mx-2"></span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">2</span>
              <span className="font-medium">Informations</span>
            </div>
          </div>
          
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
              <CardDescription>
                {isExistingClient 
                  ? `Bienvenue ${clientInfo?.name}! Finalisez la création de votre compte.` 
                  : 'Remplissez le formulaire ci-dessous pour créer votre compte'}
              </CardDescription>
              {isExistingClient && (
                <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
                  Votre adresse email est associée à un client existant. Certains champs ont été pré-remplis pour vous.
                </div>
              )}
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {businessInfo && Object.keys(businessInfo).length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-100 mb-4">
                    <p className="font-medium text-sm text-blue-800">Informations d'entreprise</p>
                    <p className="text-sm text-blue-700">{businessInfo.name || businessInfo.company}</p>
                    {businessInfo.address && <p className="text-sm text-blue-600">{businessInfo.address}</p>}
                    <p className="text-sm text-blue-600">{businessInfo.vat_number || businessInfo.business_number}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="Jean"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        placeholder="Dupont"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemple@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${isExistingClient ? 'border-green-500' : ''}`}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Type de compte</Label>
                  <Select 
                    value={role} 
                    onValueChange={(value) => setRole(value as "client" | "partner" | "ambassador" | "admin")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un type de compte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="partner">Partenaire</SelectItem>
                      <SelectItem value="ambassador">Ambassadeur</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise {isExistingClient ? '' : '(optionnel)'}</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Nom de votre entreprise"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className={`pl-10 ${(isExistingClient && clientInfo?.company) || businessInfo ? 'border-green-500' : ''}`}
                      required={isExistingClient && !!clientInfo?.company}
                    />
                  </div>
                </div>
                {businessNumber && (
                  <div className="space-y-2">
                    <Label htmlFor="businessNumber">Numéro d'entreprise</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="businessNumber"
                        placeholder="BE0123456789"
                        value={businessNumber}
                        onChange={(e) => setBusinessNumber(e.target.value)}
                        className="pl-10 border-green-500"
                        readOnly={!!businessInfo}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    "Créer un compte"
                  )}
                </Button>
                <div className="text-center text-sm">
                  Déjà un compte?{" "}
                  <Link
                    to="/login"
                    className="text-primary hover:underline"
                  >
                    Se connecter
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </Container>
    </>
  );
};

export default Signup;

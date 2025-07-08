
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Container from "@/components/layout/Container";
import { Mail, Lock, User, Building, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<"client" | "partner" | "ambassador" | "admin">("admin");
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
    
    if (!company.trim()) {
      toast.error("Le nom de l'entreprise est requis");
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
          selectedModules: ['crm', 'offers', 'contracts']
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

  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Démarrer votre essai gratuit</CardTitle>
          <CardDescription>
            {isExistingClient 
              ? `Bienvenue ${clientInfo?.name}! Démarrez votre essai gratuit de 14 jours.` 
              : 'Commencez votre essai gratuit de 14 jours sans engagement'}
          </CardDescription>
          {isExistingClient && (
            <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
              Votre adresse email est associée à un client existant. Certains champs ont été pré-remplis pour vous.
            </div>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
              <Label htmlFor="company">Entreprise</Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company"
                  placeholder="Nom de votre entreprise"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={`pl-10 ${isExistingClient && clientInfo?.company ? 'border-green-500' : ''}`}
                  required
                />
              </div>
            </div>
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
                  Démarrage de l'essai...
                </>
              ) : (
                "Démarrer l'essai gratuit"
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
    </Container>
  );
};

export default Signup;

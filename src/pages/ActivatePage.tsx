import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import { Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ActivatePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token) {
      toast.error("Token d'activation manquant");
      navigate('/signup');
    }
  }, [token, navigate]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Activation du compte...');
      
      const { data, error } = await supabase.functions.invoke('activate-prospect', {
        body: {
          activationToken: token,
          password: password
        }
      });
      
      if (error) {
        console.error("Erreur lors de l'activation:", error);
        toast.error(`Erreur d'activation: ${error.message}`);
        return;
      }
      
      if (data && data.success) {
        console.log('Compte activé avec succès:', data);
        setIsActivated(true);
        toast.success("Compte activé avec succès! Vous pouvez maintenant vous connecter.");
        
        // Rediriger vers la page de connexion après un délai
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        throw new Error(data?.error || 'Erreur inconnue lors de l\'activation');
      }
    } catch (error: any) {
      console.error("Erreur lors de l'activation:", error);
      toast.error(`Erreur: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isActivated) {
    return (
      <Container className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              Compte activé avec succès !
            </CardTitle>
            <CardDescription>
              Votre essai gratuit de 14 jours a commencé. Vous allez être redirigé vers la page de connexion.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/login')} className="w-full">
              Se connecter maintenant
            </Button>
          </CardFooter>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Activer votre compte</CardTitle>
          <CardDescription>
            {email ? `Activez votre essai gratuit pour ${email}` : 'Créez votre mot de passe pour activer votre compte'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleActivate}>
          <CardContent className="space-y-4">
            {email && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
            
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
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            {!token && (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">
                  Token d'activation manquant. Veuillez vérifier le lien dans votre email.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !token}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activation en cours...
                </>
              ) : (
                "Activer mon compte"
              )}
            </Button>
            <div className="text-center text-sm">
              Vous n'avez pas reçu l'email ?{" "}
              <Link
                to="/signup"
                className="text-primary hover:underline"
              >
                Refaire une demande
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </Container>
  );
};

export default ActivatePage;
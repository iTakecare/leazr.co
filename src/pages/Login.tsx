
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginAttempted, setLoginAttempted] = useState(false);
  const { signIn, isLoading, session } = useAuth();
  const navigate = useNavigate();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (session) {
      console.log("User already logged in, redirecting to dashboard");
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    setLoginAttempted(true);
    console.log("Login attempt with email:", email);
    
    try {
      await signIn(email, password);
    } catch (error) {
      console.error("Login form error:", error);
      // L'erreur est déjà gérée dans le contexte Auth
    }
  };

  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
          <CardDescription>
            Entrez vos identifiants pour accéder à votre compte
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {loginAttempted && !isLoading && !session && (
              <div className="bg-destructive/15 p-3 rounded-md flex items-center text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>Identifiants incorrects. Veuillez réessayer.</span>
              </div>
            )}
            
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
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié?
                </Link>
              </div>
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
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
            
            <div className="text-xs text-center">
              Les identifiants de test sont:<br />
              <strong>admin@test.com / admintest123</strong>
            </div>
            
            <div className="text-center text-sm">
              Pas encore de compte?{" "}
              <Link
                to="/signup"
                className="text-primary hover:underline"
              >
                Créer un compte
              </Link>
            </div>
            
            <div className="text-center text-sm">
              <Link
                to="/create-test-users"
                className="text-muted-foreground hover:underline"
              >
                Créer des utilisateurs de test
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </Container>
  );
};

export default Login;

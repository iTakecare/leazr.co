
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from '../context/AuthContext';
import Container from '@/components/layout/Container';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Key, EyeOff, Eye, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, session, user } = useAuth();

  useEffect(() => {
    const checkForResetToken = () => {
      const hash = location.hash || window.location.hash;
      console.log("Vérification du token de réinitialisation dans le hash:", hash);
      
      if (hash && hash.includes('type=recovery')) {
        console.log("Token de réinitialisation trouvé. Activation du mode de réinitialisation");
        setIsResetMode(true);
        return true;
      }
      return false;
    };

    const hasResetToken = checkForResetToken();
    
    if (!hasResetToken && session && user && !isResetMode) {
      console.log("L'utilisateur est déjà connecté, redirection vers le tableau de bord approprié");
      if (user.role === 'client') {
        navigate('/client/dashboard');
      } else if (user.ambassador_id) {
        navigate('/ambassador/dashboard');
      } else if (user.partner_id) {
        navigate('/partners/' + user.partner_id + '/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [session, navigate, location, user, isResetMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.error('Erreur lors de la connexion:', error);
        toast.error('Échec de la connexion : ' + (error.message || 'Erreur inconnue'));
      } else {
        // Login success - let the useEffect handle redirection based on user role
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setLoading(true);
    try {
      console.log("Tentative de mise à jour du mot de passe avec le token");
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
        toast.error('Échec de la mise à jour du mot de passe : ' + error.message);
      } else {
        toast.success('Votre mot de passe a été mis à jour avec succès');
        
        window.location.hash = '';
        
        setIsResetMode(false);
        setNewPassword('');
        setConfirmPassword('');
        
        navigate('/login', { replace: true });
      }
    } catch (error: any) {
      console.error('Exception lors de la mise à jour du mot de passe:', error);
      toast.error('Erreur lors de la mise à jour du mot de passe : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (isResetMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md overflow-hidden border-0 shadow-lg animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10 opacity-80 blur-xl -z-10"></div>
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-2">
              <User className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Réinitialisation du mot de passe</CardTitle>
            <CardDescription className="text-center">
              Créez un nouveau mot de passe sécurisé pour votre compte
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordReset}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input 
                    id="new-password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Entrez votre nouveau mot de passe" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input 
                    id="confirm-password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirmez votre nouveau mot de passe" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                disabled={loading}
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-lg animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10 opacity-80 blur-xl -z-10"></div>
        <CardHeader className="space-y-1 pb-6">
          <div className="flex justify-center mb-2">
            <LogIn className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Bienvenue</CardTitle>
          <CardDescription className="text-center">
            Connectez-vous à votre compte pour continuer
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nom@exemple.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link 
                  to="/login" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (email) {
                      setLoading(true);
                      supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/login`
                      }).then(({ error }) => {
                        setLoading(false);
                        if (error) {
                          toast.error('Erreur: ' + error.message);
                        } else {
                          toast.success('Email de réinitialisation envoyé');
                        }
                      });
                    } else {
                      toast.error('Veuillez entrer votre email');
                    }
                  }} 
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Mot de passe oublié?
                </Link>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
            <div className="text-center text-sm">
              Vous n'avez pas de compte? <Link to="/register" className="text-primary hover:underline font-medium">S'inscrire</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;

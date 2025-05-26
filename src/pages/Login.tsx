import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import Container from '@/components/layout/Container';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle, ShieldCheck, Home, ExternalLink } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import Logo from '@/components/layout/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, session, user, isAdmin, isClient, isPartner, isAmbassador, userRoleChecked } = useAuth();

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
    
    // Ne rediriger que si on a un utilisateur, que les rôles sont vérifiés, 
    // qu'on n'est pas en mode reset et qu'on n'a pas déjà tenté de rediriger
    if (!hasResetToken && session && user && userRoleChecked && !isResetMode && !redirectAttempted) {
      console.log("L'utilisateur est déjà connecté, tentative de redirection");
      setRedirectAttempted(true);
      redirectToDashboard();
    }
  }, [session, user, userRoleChecked, isResetMode, redirectAttempted]);

  const redirectToDashboard = () => {
    console.log("Redirection en cours...", { 
      isAdmin: isAdmin(), 
      isClient: isClient(), 
      isPartner: isPartner(), 
      isAmbassador: isAmbassador(),
      userRole: user?.role 
    });
    
    try {
      if (isAdmin()) {
        console.log("Redirection vers dashboard admin");
        navigate('/dashboard', { replace: true });
      } else if (isClient()) {
        console.log("Redirection vers dashboard client");
        navigate('/client/dashboard', { replace: true });
      } else if (isAmbassador()) {
        console.log("Redirection vers dashboard ambassadeur");
        navigate('/ambassador/dashboard', { replace: true });
      } else if (isPartner()) {
        console.log("Redirection vers dashboard partenaire");
        navigate('/partner/dashboard', { replace: true });
      } else {
        console.log("Redirection par défaut vers la landing page");
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error("Erreur lors de la redirection:", error);
      navigate('/', { replace: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Début de la tentative de connexion...");
    
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    
    try {
      console.log("Tentative de connexion avec:", email);
      
      const { error } = await signIn(email, password);
      
      console.log("Résultat de la connexion:", { error });

      if (error) {
        console.error('Erreur lors de la connexion:', error);
        
        // Messages d'erreur plus spécifiques
        let errorMessage = 'Erreur de connexion';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Trop de tentatives de connexion. Veuillez patienter quelques minutes.';
        } else {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      console.log("Connexion réussie");
      toast.success('Connexion réussie');
      
      // Ne pas rediriger immédiatement, laisser useEffect gérer la redirection
      // quand l'état d'authentification sera mis à jour
      
    } catch (error: any) {
      console.error('Exception lors de la connexion:', error);
      toast.error('Erreur inattendue lors de la connexion');
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isResetMode) {
    return (
      <PageTransition className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="w-full max-w-md">
          <Card className="glass-morphism shadow-xl border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 pointer-events-none" />
            <CardHeader className="space-y-1 relative z-10">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Lock className="text-primary w-6 h-6" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Réinitialisation du mot de passe</CardTitle>
              <CardDescription className="text-center">Créez un nouveau mot de passe sécurisé pour votre compte</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordReset}>
              <CardContent className="space-y-4 relative z-10">
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
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="relative z-10">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 
                    'Mise à jour...' : 
                    <span className="flex items-center justify-center">
                      Mettre à jour le mot de passe
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  }
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen flex overflow-hidden">
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12 lg:px-8 bg-gradient-to-br from-white to-blue-50 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center justify-center mb-6">
            <Logo showText={false} logoSize="lg" className="scale-[3] mb-16" />
          </div>
          
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold text-center">Connexion</CardTitle>
            </CardHeader>
            
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="nom@exemple.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Mot de passe</Label>
                    <button
                      type="button"
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
                      className="text-sm text-blue-600 hover:underline"
                      disabled={loading}
                    >
                      Mot de passe oublié?
                    </button>
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Entrez votre mot de passe" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      onClick={togglePasswordVisibility}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? 
                    'Connexion...' : 
                    <span className="flex items-center justify-center">
                      Se connecter
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  }
                </Button>
                
                <div className="w-full text-center space-y-2">
                  <Link to="/signup" className="text-sm text-blue-600 hover:underline block">
                    Pas de compte ? Inscrivez-vous
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-sm text-gray-600 hover:text-blue-600 hover:underline flex items-center justify-center w-full"
                  >
                    <Home className="mr-1 h-4 w-4" />
                    Retour à l'accueil
                  </button>
                </div>
              </CardFooter>
            </form>
          </Card>
          
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle size={16} className="text-green-500" />
              <span>Accès sécurisé à votre espace personnel</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheck size={16} className="text-green-500" />
              <span>Protection de vos données garantie</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-600/40 z-10"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')",
            filter: "brightness(0.8) blur(1px)"
          }}
        ></div>
        
        <div className="absolute bottom-12 left-12 right-12 p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 z-20">
          <h3 className="text-2xl font-bold text-white mb-2">Leazr.co</h3>
          <p className="text-white/90">
            Une plateforme sécurisée pour gérer vos offres, contrats et équipements depuis n'importe où, à tout moment.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;

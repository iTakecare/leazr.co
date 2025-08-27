import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle, ShieldCheck, Home } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import Logo from '@/components/layout/Logo';
import { getCompanySlugForUser } from '@/services/companySlugService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, isAdmin, isClient, isAmbassador, isSuperAdmin, isLoading, session } = useAuth();

  // Redirection automatique - corrigée pour éviter les conflits
  useEffect(() => {
    console.log("🔀 LOGIN REDIRECT - Vérification redirection:", {
      isLoading,
      hasUser: !!user,
      hasSession: !!session,
      userEmail: user?.email,
      userRole: user?.role
    });

    // Ne rediriger que si on a un utilisateur enrichi avec un rôle
    const hasEnrichedUser = user && user.email && user.role;
    
    if (hasEnrichedUser && !isLoading) {
      const userEmail = user.email;
      const userRole = user.role;
      
      console.log("🔀 LOGIN REDIRECT - Redirection confirmée", { userEmail, userRole });
      
      // Délai pour s'assurer que l'enrichissement est terminé
      const timer = setTimeout(async () => {
        try {
          // Gestion spéciale pour l'admin SaaS
          if (isSuperAdmin && typeof isSuperAdmin === 'function' && isSuperAdmin()) {
            console.log("🔀 LOGIN REDIRECT - Super Admin SaaS détecté");
            navigate(`/admin/leazr-saas-dashboard`, { replace: true });
            return;
          }

          // Pour les autres utilisateurs, récupérer le slug d'entreprise
          console.log("🔀 LOGIN REDIRECT - Récupération du slug d'entreprise...");
          const companySlug = await getCompanySlugForUser();
          
          if (!companySlug) {
            console.error("🔀 LOGIN REDIRECT - Slug d'entreprise manquant");
            toast.error("Erreur: Impossible d'accéder à votre entreprise");
            return;
          }

          console.log("🔀 LOGIN REDIRECT - Slug récupéré:", companySlug);

          // Redirection basée sur le rôle
          if (userRole === 'admin') {
            console.log("🔀 LOGIN REDIRECT - Redirection admin");
            navigate(`/${companySlug}/admin/dashboard`, { replace: true });
          } else if (userRole === 'client') {
            console.log("🔀 LOGIN REDIRECT - Redirection client");
            navigate(`/${companySlug}/client/dashboard`, { replace: true });
          } else if (userRole === 'ambassador') {
            console.log("🔀 LOGIN REDIRECT - Redirection ambassador");
            navigate(`/${companySlug}/ambassador/dashboard`, { replace: true });
          } else {
            console.log("🔀 LOGIN REDIRECT - Redirection par défaut vers admin");
            navigate(`/${companySlug}/admin/dashboard`, { replace: true });
          }
        } catch (error) {
          console.error("🔀 LOGIN REDIRECT - Erreur lors de la redirection:", error);
          toast.error("Erreur lors de la redirection");
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, session, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🔐 LOGIN FORM - Soumission du formulaire");
    
    if (!email || !password) {
      console.log("🔐 LOGIN FORM - Champs manquants");
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    console.log("🔐 LOGIN FORM - Début de la connexion pour:", email);
    
    try {
      const { error } = await signIn(email, password);

      if (error) {
        console.error("🔐 LOGIN FORM - Erreur de connexion:", error);
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

      console.log("🔐 LOGIN FORM - Connexion réussie, en attente de redirection automatique");
      toast.success('Connexion réussie');
      // Ne pas appeler setLoading(false) ici, laisser la redirection se faire
      
    } catch (error: any) {
      console.error('🔐 LOGIN FORM - Exception lors de la connexion:', error);
      toast.error('Erreur inattendue lors de la connexion');
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Afficher un loader si l'utilisateur est connecté et enrichi
  if (user && user.role && !isLoading) {
    console.log("🔀 LOGIN RENDER - Redirection en cours...");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Redirection en cours...</p>
          <p className="text-sm text-gray-500 mt-2">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  console.log("🔀 LOGIN RENDER - Rendu du formulaire de connexion", {
    isLoading,
    hasUser: !!user,
    loading
  });

  return (
    <PageTransition className="min-h-screen flex overflow-hidden">
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12 lg:px-8 bg-gradient-to-br from-white to-blue-50 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center justify-center mb-6">
            <Logo showText={false} logoSize="2xl" className="mb-16" />
          </div>
          
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold text-center">
                Connexion
              </CardTitle>
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
                    <Link
                      to="/forgot-password"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Mot de passe oublié?
                    </Link>
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
          <h3 className="text-2xl font-bold text-white mb-2">
            Leazr.co
          </h3>
          <p className="text-white/90">
            Une plateforme sécurisée pour gérer vos offres, contrats et équipements depuis n'importe où, à tout moment.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;

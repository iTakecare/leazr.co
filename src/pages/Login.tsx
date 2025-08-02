import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle, ShieldCheck, Home } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import Logo from '@/components/layout/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, isAdmin, isClient, isPartner, isAmbassador, isLoading, session } = useAuth();

  // Redirection automatique - améliorée pour gérer les problèmes d'enrichissement
  useEffect(() => {
    console.log("🔀 LOGIN REDIRECT - Vérification redirection:", {
      isLoading,
      hasUser: !!user,
      hasSession: !!session,
      userEmail: user?.email,
      userRole: user?.role
    });

    // Rediriger si on a un utilisateur OU une session valide (même sans enrichissement)
    const shouldRedirect = (user && user.email) || (session && session.user && session.user.email);
    
    if (shouldRedirect) {
      const userEmail = user?.email || session?.user?.email;
      const userRole = user?.role || 'admin'; // Fallback vers admin si pas de rôle
      
      console.log("🔀 LOGIN REDIRECT - Utilisateur/Session détecté, redirection...", userEmail, "Role:", userRole);
      
      // Utiliser setTimeout pour éviter les conflits de rendu
      const timer = setTimeout(async () => {
        // Récupérer le slug d'entreprise de l'utilisateur
        const getUserCompanySlug = async () => {
          try {
            const userId = user?.id || session?.user?.id;
            if (!userId) return null;

            const { data } = await supabase
              .from('profiles')
              .select(`
                company_id,
                companies!inner (
                  slug
                )
              `)
              .eq('user_id', userId)
              .single();

            return data?.companies?.slug || null;
          } catch (error) {
            console.error('Erreur lors de la récupération du slug d\'entreprise:', error);
            return null;
          }
        };

        // Redirection basée sur le rôle et l'email avec slug d'entreprise
        if (userEmail === "ecommerce@itakecare.be") {
          console.log("🔀 LOGIN REDIRECT - Redirection vers SaaS dashboard");
          const companySlug = await getUserCompanySlug();
          if (companySlug) {
            navigate(`/${companySlug}/admin/leazr-saas-dashboard`, { replace: true });
          } else {
            navigate('/admin/leazr-saas-dashboard', { replace: true }); // Fallback pour compatibilité
          }
        } else if (userEmail === "hello@itakecare.be" || userRole === 'admin') {
          console.log("🔀 LOGIN REDIRECT - Redirection vers admin dashboard");
          const companySlug = await getUserCompanySlug();
          if (companySlug) {
            navigate(`/${companySlug}/admin/dashboard`, { replace: true });
          } else {
            navigate('/admin/dashboard', { replace: true }); // Fallback pour compatibilité
          }
        } else if (isClient()) {
          console.log("🔀 LOGIN REDIRECT - Redirection vers client dashboard");
          const companySlug = await getUserCompanySlug();
          if (companySlug) {
            navigate(`/${companySlug}/client/dashboard`, { replace: true });
          } else {
            navigate('/client/dashboard', { replace: true }); // Fallback pour compatibilité
          }
        } else if (isAmbassador()) {
          console.log("🔀 LOGIN REDIRECT - Redirection vers ambassador dashboard");
          const companySlug = await getUserCompanySlug();
          if (companySlug) {
            navigate(`/${companySlug}/ambassador/dashboard`, { replace: true });
          } else {
            navigate('/ambassador/dashboard', { replace: true }); // Fallback pour compatibilité
          }
        } else if (isPartner()) {
          console.log("🔀 LOGIN REDIRECT - Redirection vers partner dashboard");
          const companySlug = await getUserCompanySlug();
          if (companySlug) {
            navigate(`/${companySlug}/partner/dashboard`, { replace: true });
          } else {
            navigate('/partner/dashboard', { replace: true }); // Fallback pour compatibilité
          }
        } else {
          console.log("🔀 LOGIN REDIRECT - Redirection par défaut vers admin dashboard");
          navigate('/admin/dashboard', { replace: true });
        }
      }, 100); // Délai légèrement plus long pour laisser le temps à l'enrichissement

      return () => clearTimeout(timer);
    }
  }, [user, session, navigate, isClient, isPartner, isAmbassador]);

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

  // Afficher un loader si l'utilisateur est déjà connecté ou si on a une session
  if ((user && !isLoading) || (session && session.user)) {
    console.log("🔀 LOGIN RENDER - Utilisateur/Session détecté, affichage du loader de redirection");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Redirection en cours...</p>
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

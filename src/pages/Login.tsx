
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import Logo from '@/components/layout/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  
  const { signIn, user, isLoading, isClient, isAmbassador, isPartner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log("🔀 LOGIN REDIRECT - Vérification redirection:", {
    isLoading,
    hasUser: !!user,
    userEmail: user?.email,
    userRole: user?.role
  });

  // Redirection automatique si l'utilisateur est déjà connecté
  useEffect(() => {
    if (!isLoading && user) {
      console.log("🔀 LOGIN REDIRECT - Utilisateur connecté, redirection...", user.email, "Role:", user.role);
      
      // Déterminer la redirection selon le rôle
      if (isClient()) {
        console.log("🔀 LOGIN REDIRECT - Redirection vers client dashboard");
        navigate('/client/dashboard');
      } else if (isAmbassador()) {
        console.log("🔀 LOGIN REDIRECT - Redirection vers ambassador dashboard");
        navigate('/ambassador/dashboard');  
      } else if (isPartner()) {
        console.log("🔀 LOGIN REDIRECT - Redirection vers partner dashboard");
        navigate('/partner/dashboard');
      } else {
        console.log("🔀 LOGIN REDIRECT - Redirection vers dashboard");
        navigate('/dashboard');
      }
    }
  }, [user, isLoading, navigate, isClient, isAmbassador, isPartner]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Format d\'email invalide';
    }
    
    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log("🔑 LOGIN SUBMIT - Tentative de connexion");
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error("🔑 LOGIN ERROR:", error);
        let errorMessage = 'Erreur de connexion';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
        }
        
        setErrors({ general: errorMessage });
        toast.error(errorMessage);
      } else {
        console.log("🔑 LOGIN SUCCESS - Connexion réussie");
        toast.success('Connexion réussie');
      }
    } catch (error) {
      console.error('🔑 LOGIN CATCH ERROR:', error);
      const errorMessage = 'Une erreur inattendue s\'est produite';
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  console.log("🔀 LOGIN RENDER - Rendu du formulaire de connexion", {
    isLoading,
    hasUser: !!user,
    loading
  });

  // Afficher un loader pendant la vérification de l'auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Vérification de votre session...</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est connecté, afficher un loader de redirection
  if (user) {
    console.log("🔀 LOGIN RENDER - Utilisateur connecté, affichage du loader de redirection");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="full" logoSize="lg" showText={false} />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Connexion
          </CardTitle>
          <CardDescription className="text-slate-600">
            Accédez à votre espace Leazr
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {errors.general}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`transition-colors ${errors.email ? 'border-red-300 focus:border-red-500' : 'focus:border-blue-500'}`}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pr-10 transition-colors ${errors.password ? 'border-red-300 focus:border-red-500' : 'focus:border-blue-500'}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-slate-600 hover:text-blue-600 transition-colors"
              disabled={loading}
            >
              Mot de passe oublié ?
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

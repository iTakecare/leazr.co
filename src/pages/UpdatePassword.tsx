
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/layout/Logo';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log("UpdatePassword - Début de l'initialisation");
      console.log("UpdatePassword - URL complète:", window.location.href);
      console.log("UpdatePassword - Search params:", window.location.search);
      
      // Vérifier si nous avons les paramètres nécessaires pour la réinitialisation
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const token = searchParams.get('token');
      
      console.log("UpdatePassword - Paramètres détectés:", {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        type,
        token: !!token,
        allParams: Object.fromEntries(searchParams.entries())
      });

      // Vérifier la session actuelle
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log("UpdatePassword - Session actuelle:", !!currentSession);
      
      if (accessToken && refreshToken && type === 'recovery') {
        try {
          console.log("UpdatePassword - Configuration avec tokens access/refresh");
          // Définir la session avec les tokens reçus
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error("Erreur lors de la définition de la session:", error);
            toast.error("Lien de réinitialisation invalide ou expiré");
            navigate('/login');
            return;
          }
          
          console.log("Session définie avec succès pour la réinitialisation");
          setSessionReady(true);
          setIsAuthenticating(false);
        } catch (err) {
          console.error("Erreur lors de la configuration de la session:", err);
          toast.error("Erreur lors de la configuration de la session");
          navigate('/login');
        }
      } else if (token && type === 'recovery') {
        console.log("UpdatePassword - Configuration avec token simple");
        // Cas d'un token simple de récupération
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          
          if (error) {
            console.error("Erreur lors de la vérification du token:", error);
            toast.error("Lien de réinitialisation invalide ou expiré");
            navigate('/login');
            return;
          }
          
          console.log("Token vérifié avec succès");
          setSessionReady(true);
          setIsAuthenticating(false);
        } catch (err) {
          console.error("Erreur lors de la vérification du token:", err);
          toast.error("Erreur lors de la vérification du token");
          navigate('/login');
        }
      } else if (currentSession) {
        console.log("UpdatePassword - Session existante détectée, permettre la réinitialisation");
        // Si l'utilisateur est déjà connecté, on peut permettre la réinitialisation
        setSessionReady(true);
        setIsAuthenticating(false);
      } else {
        console.log("UpdatePassword - Aucun paramètre valide trouvé");
        console.log("UpdatePassword - Redirection vers login");
        toast.error("Lien de réinitialisation invalide ou manquant");
        navigate('/login');
      }
    };

    handlePasswordReset();
  }, [searchParams, navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionReady) {
      toast.error('Session non prête pour la mise à jour du mot de passe');
      return;
    }
    
    if (!password || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    
    try {
      console.log("Tentative de mise à jour du mot de passe");
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error("Erreur lors de la mise à jour du mot de passe:", error);
        toast.error('Erreur lors de la mise à jour du mot de passe: ' + error.message);
        return;
      }

      console.log("Mot de passe mis à jour avec succès");
      toast.success('Mot de passe mis à jour avec succès');
      
      // Déconnecter l'utilisateur pour qu'il se reconnecte avec le nouveau mot de passe
      await supabase.auth.signOut();
      
      // Rediriger vers la page de connexion après un délai
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
      
    } catch (error: any) {
      console.error('Exception lors de la mise à jour du mot de passe:', error);
      toast.error('Erreur inattendue lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader pendant la configuration de la session
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50 px-6 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification du lien de réinitialisation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50 px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center mb-6">
          <Logo showText={false} logoSize="lg" className="scale-[2] mb-8" />
        </div>
        
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold text-center">
              Nouveau mot de passe
            </CardTitle>
            <CardDescription className="text-center">
              Choisissez un nouveau mot de passe pour votre compte
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleUpdatePassword}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Entrez votre nouveau mot de passe" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirmez votre nouveau mot de passe" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
                disabled={loading || !sessionReady}
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;

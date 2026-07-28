
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from "react-router";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CompanyLogoForToken from '@/components/layout/CompanyLogoForToken';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import PasswordValidationDisplay from '@/components/auth/PasswordValidationDisplay';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companySlug: pathCompanySlug } = useParams<{ companySlug?: string }>();
  
  // Read companySlug from URL path OR query params
  const companySlug = pathCompanySlug || searchParams.get('companySlug') || undefined;

  // Password validation with debug logging
  const passwordValidation = usePasswordValidation(password);
  
  // Helper function to get the correct login path
  const getLoginPath = () => {
    return companySlug ? `/${companySlug}/login` : '/login';
  };
  
  // Debug password validation
  useEffect(() => {
    console.log("🔐 Password validation state:", {
      password: password ? `${password.length} chars` : 'empty',
      validation: passwordValidation,
      isValid: passwordValidation.isValid
    });
  }, [password, passwordValidation]);

  // Add state logging and timeout protection
  useEffect(() => {
    console.log("🔄 UpdatePassword - State change:", { 
      isAuthenticating, 
      sessionReady,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticating, sessionReady]);

  // Retry function for failed verification
  const retryVerification = () => {
    console.log("🔄 Retrying verification...");
    setIsAuthenticating(true);
    // Force re-run of the verification effect
    window.location.reload();
  };

  // Reduced timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isAuthenticating) {
        console.warn("⏰ UpdatePassword - Timeout reached after 5s, forcing interface unlock");
        setIsAuthenticating(false);
        toast.error("Timeout de vérification - cliquez sur Réessayer si nécessaire");
      }
    }, 5000); // Reduced to 5 seconds

    return () => clearTimeout(timeoutId);
  }, [isAuthenticating]);

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        console.log("🚀 UpdatePassword - Début de l'initialisation");
        console.log("🔗 UpdatePassword - URL complète:", window.location.href);
        console.log("🔍 UpdatePassword - Search params:", window.location.search);
        console.log("📍 UpdatePassword - Hash:", window.location.hash);
        console.log("🏢 UpdatePassword - Company slug from URL:", companySlug);
        
        // Si on a un companySlug dans l'URL, récupérer le company_id
        if (companySlug) {
          console.log("🔍 UpdatePassword - Fetching company_id from slug:", companySlug);
          const { data: companyData, error: companyError } = await supabase
            .rpc('get_company_by_slug', { company_slug: companySlug });
          
          if (companyError) {
            console.error("❌ UpdatePassword - Error fetching company by slug:", companyError);
          } else if (companyData && companyData.length > 0) {
            console.log("✅ UpdatePassword - Company found:", companyData[0].id);
            setCompanyId(companyData[0].id);
          } else {
            console.warn("⚠️ UpdatePassword - No company found for slug:", companySlug);
          }
        }
        
        // Force unlock after 3 seconds for debugging
        setTimeout(() => {
          if (isAuthenticating) {
            console.warn("⚡ FORCE UNLOCK - Debug mode après 3s");
            setIsAuthenticating(false);
            setSessionReady(true);
            toast.success("Mode debug activé - validation bypassed");
          }
        }, 3000);
        
        // Extraire les paramètres depuis les query params ou les fragments
        const getParams = () => {
          const params = new URLSearchParams();
          
          // D'abord, récupérer les paramètres de l'URL normale
          searchParams.forEach((value, key) => {
            params.set(key, value);
          });
          
          // Puis vérifier les fragments dans le hash (pour les redirections Supabase)
          const hash = window.location.hash.substring(1);
          if (hash) {
            hash.split('&').forEach(param => {
              const [key, value] = param.split('=');
              if (key && value) {
                params.set(key, decodeURIComponent(value));
              }
            });
          }
          
          return params;
        };

        const params = getParams();
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const token = params.get('token');
        const email = params.get('email');
        const customToken = params.get('token');
        
        console.log("UpdatePassword - Paramètres détectés:", {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
          type,
          token: !!token,
          customToken: !!customToken,
          url: window.location.href,
          allParams: Object.fromEntries(params.entries())
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
              setIsAuthenticating(false);
              navigate(getLoginPath());
              return;
            }
            
            console.log("Session définie avec succès pour la réinitialisation");
            setSessionReady(true);
            setIsAuthenticating(false);
          } catch (err) {
            console.error("Erreur lors de la configuration de la session:", err);
            toast.error("Erreur lors de la configuration de la session");
            setIsAuthenticating(false);
            navigate(getLoginPath());
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
              setIsAuthenticating(false);
              navigate(getLoginPath());
              return;
            }
            
            console.log("Token vérifié avec succès");
            setSessionReady(true);
            setIsAuthenticating(false);
          } catch (err) {
            console.error("Erreur lors de la vérification du token:", err);
            toast.error("Erreur lors de la vérification du token");
            setIsAuthenticating(false);
            navigate(getLoginPath());
          }
        } else if (customToken && (type === 'invitation' || type === 'password_reset' || !type)) {
          console.log("UpdatePassword - Token personnalisé détecté:", { customToken, type });
          console.log("UpdatePassword - Vérification du token via edge function...");
          
          // Use edge function to verify token with service role permissions
          try {
            const { data: verificationResult, error: functionError } = await supabase.functions.invoke(
              'verify-custom-token',
              {
                body: { token: customToken, type }
              }
            );

            console.log("UpdatePassword - Résultat vérification token:", { verificationResult, functionError });

            if (functionError || !verificationResult?.success) {
              console.error("UpdatePassword - Token invalide ou expiré:", functionError || verificationResult?.error);
              toast.error("Lien d'activation invalide ou expiré");
              setIsAuthenticating(false);
              navigate(getLoginPath());
              return;
            }

            const tokenData = verificationResult.token_data;
            console.log("Token personnalisé valide:", { 
              tokenType: tokenData.token_type, 
              userEmail: tokenData.user_email,
              metadata: tokenData.metadata 
            });
            
            // Stocker les données du token pour utilisation lors de la mise à jour
            sessionStorage.setItem('custom_token_data', JSON.stringify(tokenData));
            
            // Utiliser l'edge function pour récupérer le company_id via le service role
            console.log("🔍 UpdatePassword - Token metadata:", tokenData.metadata);
            
            if (tokenData.metadata && tokenData.metadata.entity_id) {
              console.log("🎯 UpdatePassword - Found entity_id:", tokenData.metadata.entity_id);
              
              try {
                console.log("📡 UpdatePassword - Calling get-ambassador-company edge function...");
                const { data: response, error: functionError } = await supabase.functions.invoke('get-ambassador-company', {
                  body: { token: customToken }
                });
                
                console.log("🏢 UpdatePassword - Edge function response:", { response, functionError });
                
                if (!functionError && response?.success && response?.company_id) {
                  console.log("✅ UpdatePassword - Setting company_id:", response.company_id);
                  setCompanyId(response.company_id);
                } else {
                  console.error("❌ UpdatePassword - Failed to get company from edge function:", functionError || response);
                }
              } catch (err) {
                console.error("💥 UpdatePassword - Exception calling edge function:", err);
              }
            } else if (tokenData.metadata && tokenData.metadata.company_id) {
              // Fallback pour les anciens tokens qui pourraient avoir company_id directement
              console.log("🔄 UpdatePassword - Using direct company_id:", tokenData.metadata.company_id);
              setCompanyId(tokenData.metadata.company_id);
            } else {
              console.log("⚠️ UpdatePassword - No entity_id or company_id in metadata");
            }
            
            setSessionReady(true);
            setIsAuthenticating(false);
          } catch (err) {
            console.error("Erreur lors de la vérification du token personnalisé:", err);
            toast.error("Erreur lors de la vérification du token");
            setIsAuthenticating(false);
            navigate(getLoginPath());
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
          setIsAuthenticating(false);
          navigate(getLoginPath());
        }
      } catch (error) {
        console.error("💥 UpdatePassword - Exception globale:", error);
        toast.error("Erreur lors de l'initialisation");
        setIsAuthenticating(false);
        navigate(getLoginPath());
      }
    };

    handlePasswordReset();
  }, [searchParams, navigate, companySlug]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionReady) {
      toast.error('Session non prête pour la mise à jour du mot de passe');
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const customToken = params.get('token');
    
    if (!password || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    // Validation du mot de passe avec les nouvelles règles
    console.log("🔐 Validation mot de passe:", passwordValidation);
    if (!passwordValidation.isValid) {
      toast.error('Veuillez respecter tous les critères de mot de passe');
      console.log("❌ Validation échouée:", passwordValidation);
      return;
    }
    console.log("✅ Validation réussie");

    setLoading(true);
    
    try {
      console.log("Tentative de mise à jour du mot de passe");
      
      // Si c'est un token personnalisé, utiliser update-password-custom directement
      if (customToken) {
        console.log("🔑 Mise à jour mot de passe avec token personnalisé");
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlType = urlParams.get('type');
        console.log("🔍 Type détecté depuis l'URL:", urlType);
        
        // Pour les tokens d'invitation, utiliser directement update-password-custom
        if (urlType === 'invitation' || !urlType) {
          console.log("🔄 Utilisation FORCÉE de update-password-custom pour invitation");
          
          try {
            const { data: updateData, error: updateError } = await supabase.functions.invoke('update-password-custom', {
              body: {
                token: customToken,
                password: password
                // L'email sera automatiquement récupéré depuis le token par l'edge function
              }
            });

            console.log("📤 Réponse update-password-custom:", { updateData, updateError });

            if (updateError) {
              console.error("❌ Erreur edge function:", updateError);
              toast.error(`Erreur technique: ${updateError.message}`);
              return;
            }

            if (!updateData?.success) {
              console.error("❌ Échec de la mise à jour:", updateData);
              toast.error(updateData?.error || 'Erreur lors de la mise à jour du mot de passe');
              return;
            }
            
            console.log("✅ Mot de passe mis à jour avec succès");
            toast.success("Mot de passe défini avec succès !");
            
            sessionStorage.removeItem('custom_token_data');
            setTimeout(() => navigate(getLoginPath()), 2000);
            return;
          } catch (err) {
            console.error("💥 Exception lors de l'appel:", err);
            toast.error("Erreur lors de la communication avec le serveur");
            return;
          }
        } else if (urlType === 'password_reset') {
          console.log("🔄 Utilisation de verify-auth-token pour password_reset");
          
          const { data: updateData, error: updateError } = await supabase.functions.invoke('verify-auth-token', {
            body: {
              token: customToken,
              newPassword: password
            }
          });

          if (updateError || !updateData?.success) {
            console.error("❌ Erreur verify-auth-token:", { updateError, updateData });
            toast.error(updateData?.error || updateError?.message || 'Erreur lors de la mise à jour');
            return;
          }
          
          toast.success("Mot de passe mis à jour avec succès !");
          setTimeout(() => navigate(getLoginPath()), 2000);
          return;
        } else {
          console.error("❌ Type de token inconnu:", urlType);
          toast.error(`Type de token non reconnu: ${urlType}`);
          return;
        }
      } else {
        console.log("🔄 Cas normal avec session Supabase");
        // Cas normal avec session Supabase - utiliser l'API native
        const { error } = await supabase.auth.updateUser({
          password: password
        });

        if (error) {
          console.error("❌ Erreur updateUser:", error);
          toast.error('Erreur lors de la mise à jour: ' + error.message);
          return;
        }
        
        console.log("✅ Mot de passe mis à jour avec succès");
        toast.success('Mot de passe mis à jour avec succès');
      }
      
      // Déconnecter l'utilisateur pour qu'il se reconnecte avec le nouveau mot de passe
      await supabase.auth.signOut();
      
      // Rediriger vers la page de connexion après un délai
      setTimeout(() => {
        navigate(getLoginPath(), { replace: true });
      }, 2000);
      
    } catch (error: any) {
      console.error('Exception lors de la mise à jour du mot de passe:', error);
      toast.error('Erreur inattendue lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader pendant la configuration de la session avec option de retry
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50 px-6 py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification du lien de réinitialisation...</p>
          <Button 
            variant="outline" 
            onClick={retryVerification}
            className="mt-4"
            size="sm"
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50 px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center mb-6">
          <CompanyLogoForToken 
            companyId={companyId} 
            showText={false} 
            logoSize="lg" 
            className="scale-[2] mb-8" 
          />
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

              {/* Password validation display with fallback */}
              {password && (
                <div className="mt-2 space-y-2">
                  {/* Simplified validation display */}
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm font-medium mb-2">Critères du mot de passe:</p>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={passwordValidation.minLength ? "text-green-600" : "text-red-600"}>
                          {passwordValidation.minLength ? "✅" : "❌"}
                        </span>
                        <span>Au moins 6 caractères</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={passwordValidation.hasUppercase ? "text-green-600" : "text-red-600"}>
                          {passwordValidation.hasUppercase ? "✅" : "❌"}
                        </span>
                        <span>Une lettre majuscule (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={passwordValidation.hasLowercase ? "text-green-600" : "text-red-600"}>
                          {passwordValidation.hasLowercase ? "✅" : "❌"}
                        </span>
                        <span>Une lettre minuscule (a-z)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={passwordValidation.hasNumber ? "text-green-600" : "text-red-600"}>
                          {passwordValidation.hasNumber ? "✅" : "❌"}
                        </span>
                        <span>Un chiffre (0-9)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={passwordValidation.hasSpecialChar ? "text-green-600" : "text-red-600"}>
                          {passwordValidation.hasSpecialChar ? "✅" : "❌"}
                        </span>
                        <span>Un caractère spécial (!@#$%^&*)</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className={passwordValidation.isValid ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {passwordValidation.isValid ? "✅ Valide" : "❌ Invalide"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
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
              
              <div className="space-y-3">
                {/* Debug info */}
                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                  Debug: Loading={loading ? 'Oui' : 'Non'} | 
                  SessionReady={sessionReady ? 'Oui' : 'Non'} | 
                  Valid={passwordValidation.isValid ? 'Oui' : 'Non'} | 
                  Match={password === confirmPassword ? 'Oui' : 'Non'}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
                  disabled={loading || !passwordValidation.isValid || !password || !confirmPassword}
                >
                  {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;

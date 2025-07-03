
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/layout/Logo';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("AuthCallback - URL complète:", window.location.href);
      console.log("AuthCallback - Hash:", window.location.hash);
      console.log("AuthCallback - Search:", window.location.search);

      // Extraire les paramètres du hash (fragments) ou des query params
      const getParams = () => {
        const params = new URLSearchParams();
        
        // Vérifier d'abord le hash (fragments comme #access_token=...)
        const hash = window.location.hash.substring(1);
        if (hash) {
          console.log("AuthCallback - Paramètres trouvés dans le hash:", hash);
          hash.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key && value) {
              params.set(key, decodeURIComponent(value));
            }
          });
        }
        
        // Puis vérifier les query params normaux (?access_token=...)
        const search = window.location.search.substring(1);
        if (search) {
          console.log("AuthCallback - Paramètres trouvés dans search:", search);
          search.split('&').forEach(param => {
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
      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');

      console.log("AuthCallback - Paramètres extraits:", {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        type,
        error: errorParam,
        errorDescription
      });

      // Gestion des erreurs
      if (errorParam) {
        console.error("AuthCallback - Erreur d'authentification:", errorParam, errorDescription);
        navigate('/login?error=' + encodeURIComponent(errorDescription || errorParam));
        return;
      }

      // Gestion de la récupération de mot de passe
      if (type === 'recovery' && accessToken && refreshToken) {
        console.log("AuthCallback - Redirection vers update-password avec tokens");
        navigate(`/update-password?access_token=${accessToken}&refresh_token=${refreshToken}&type=${type}`);
        return;
      }

      // Gestion de la confirmation d'email
      if (type === 'signup' || type === 'email_change') {
        console.log("AuthCallback - Confirmation d'email/inscription");
        if (accessToken && refreshToken) {
          try {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            navigate('/dashboard');
          } catch (error) {
            console.error("Erreur lors de la définition de session:", error);
            navigate('/login?error=session_error');
          }
        } else {
          navigate('/login?message=email_confirmed');
        }
        return;
      }

      // Si on a des tokens mais pas de type spécifique, essayer de les utiliser
      if (accessToken && refreshToken) {
        console.log("AuthCallback - Tokens trouvés sans type spécifique");
        try {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          navigate('/dashboard');
        } catch (error) {
          console.error("Erreur lors de la définition de session:", error);
          navigate('/login?error=session_error');
        }
        return;
      }

      // Fallback : rediriger vers login
      console.log("AuthCallback - Aucun paramètre valide trouvé, redirection vers login");
      navigate('/login');
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50 px-6 py-12">
      <div className="text-center">
        <div className="flex flex-col items-center justify-center mb-6">
          <Logo showText={false} logoSize="lg" className="scale-[2] mb-8" />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Traitement de l'authentification...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

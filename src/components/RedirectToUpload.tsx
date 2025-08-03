import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';

const RedirectToUpload = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useSafeNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      console.log('🔗 REDIRECT - Starting redirect with company slug lookup for token:', token);
      
      if (!token) {
        console.error('❌ REDIRECT - No token provided in URL');
        navigate('/', { replace: true });
        return;
      }

      try {
        console.log('🔍 REDIRECT - Getting company slug for token:', token);
        
        // Utiliser la nouvelle fonction pour récupérer le company slug
        const { data: companySlug, error } = await supabase
          .rpc('get_company_slug_by_upload_token', { upload_token: token });

        console.log('📊 REDIRECT - Company slug query result:', { companySlug, error });

        if (error) {
          console.error('❌ REDIRECT - Error getting company slug:', error);
          navigate('/', { replace: true });
          return;
        }

        if (!companySlug) {
          console.error('❌ REDIRECT - No company slug found for token (link expired or invalid)');
          navigate('/', { replace: true });
          return;
        }

        console.log('✅ REDIRECT - Company slug found:', companySlug);
        
        // Rediriger vers l'URL avec company slug
        const redirectPath = `/${companySlug}/offer/documents/upload/${token}`;
        
        console.log('🚀 REDIRECT - Redirecting to:', redirectPath);
        navigate(redirectPath, { replace: true });

      } catch (error) {
        console.error('💥 REDIRECT - Unexpected error during redirect:', error);
        navigate('/', { replace: true });
      }
    };

    handleRedirect();
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirection en cours...</p>
      </div>
    </div>
  );
};

export default RedirectToUpload;
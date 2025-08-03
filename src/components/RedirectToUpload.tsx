import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';

const RedirectToUpload = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useSafeNavigate();

  useEffect(() => {
    const handleRedirect = () => {
      console.log('🔗 REDIRECT - Starting direct redirect with token:', token);
      
      if (!token) {
        console.error('❌ REDIRECT - No token provided in URL');
        navigate('/', { replace: true });
        return;
      }

      // Redirection directe sans validation - OfferDocumentUpload s'occupera de la validation
      const redirectPath = `/offer/documents/upload/${token}`;
      
      console.log('🚀 REDIRECT - Direct redirect to:', redirectPath);
      navigate(redirectPath, { replace: true });
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
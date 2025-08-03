import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const RedirectToUpload = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      if (!token) {
        console.error('No token provided');
        return;
      }

      try {
        // Récupérer le lien d'upload complet depuis la base
        const { data: uploadLink, error } = await supabase
          .from('offer_upload_links')
          .select('*')
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .is('used_at', null)
          .maybeSingle();

        if (error || !uploadLink) {
          console.error('Link expired or not found:', error);
          // Redirection vers une page d'erreur ou homepage
          navigate('/', { replace: true });
          return;
        }

        // Récupérer l'offre pour le company slug
        const { data: offer } = await supabase
          .from('offers')
          .select('company_id')
          .eq('id', uploadLink.offer_id)
          .maybeSingle();

        if (!offer) {
          console.error('Offer not found');
          navigate('/', { replace: true });
          return;
        }

        // Récupérer le company slug
        const { data: company } = await supabase
          .from('companies')
          .select('slug')
          .eq('id', offer.company_id)
          .maybeSingle();

        // Construire l'URL de redirection
        const companySlug = company?.slug;
        const redirectPath = companySlug 
          ? `/${companySlug}/offer/documents/upload/${token}`
          : `/offer/documents/upload/${token}`;

        console.log('Redirecting to:', redirectPath);
        navigate(redirectPath, { replace: true });

      } catch (error) {
        console.error('Error during redirect:', error);
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
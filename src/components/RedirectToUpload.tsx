import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';

const RedirectToUpload = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useSafeNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      console.log('🔗 REDIRECT - Starting redirect process with token:', token);
      
      if (!token) {
        console.error('❌ REDIRECT - No token provided in URL');
        navigate('/', { replace: true });
        return;
      }

      try {
        console.log('🔍 REDIRECT - Searching for upload link with token:', token);
        
        // Récupérer le lien d'upload complet depuis la base
        const { data: uploadLink, error } = await supabase
          .from('offer_upload_links')
          .select('*')
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .is('used_at', null)
          .maybeSingle();

        console.log('📊 REDIRECT - Upload link query result:', { uploadLink, error });

        if (error) {
          console.error('❌ REDIRECT - Database error:', error);
          navigate('/', { replace: true });
          return;
        }

        if (!uploadLink) {
          console.error('❌ REDIRECT - Link not found, expired, or already used');
          navigate('/', { replace: true });
          return;
        }

        console.log('✅ REDIRECT - Valid upload link found, offer_id:', uploadLink.offer_id);

        // Récupérer l'offre pour le company slug
        const { data: offer, error: offerError } = await supabase
          .from('offers')
          .select('company_id')
          .eq('id', uploadLink.offer_id)
          .maybeSingle();

        console.log('📊 REDIRECT - Offer query result:', { offer, offerError });

        if (offerError) {
          console.error('❌ REDIRECT - Error fetching offer:', offerError);
          navigate('/', { replace: true });
          return;
        }

        if (!offer) {
          console.error('❌ REDIRECT - Offer not found for ID:', uploadLink.offer_id);
          navigate('/', { replace: true });
          return;
        }

        console.log('✅ REDIRECT - Offer found, company_id:', offer.company_id);

        // Récupérer le company slug
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('slug')
          .eq('id', offer.company_id)
          .maybeSingle();

        console.log('📊 REDIRECT - Company query result:', { company, companyError });

        if (companyError) {
          console.warn('⚠️ REDIRECT - Error fetching company (proceeding without slug):', companyError);
        }

        // Construire l'URL de redirection
        const companySlug = company?.slug;
        const redirectPath = companySlug 
          ? `/${companySlug}/offer/documents/upload/${token}`
          : `/offer/documents/upload/${token}`;

        console.log('🎯 REDIRECT - Final redirect path:', redirectPath);
        console.log('⏰ REDIRECT - Adding 500ms delay before redirect for stability');
        
        // Ajouter un délai pour éviter les problèmes de timing
        setTimeout(() => {
          console.log('🚀 REDIRECT - Executing navigation now');
          navigate(redirectPath, { replace: true });
        }, 500);

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
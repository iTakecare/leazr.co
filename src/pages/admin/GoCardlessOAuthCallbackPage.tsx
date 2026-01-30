import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

type CallbackState = 'loading' | 'success' | 'error';

const GoCardlessOAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { companySlug } = useParams();
  
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const stateToken = searchParams.get('state');

      // Handle error from GoCardless
      const error = searchParams.get('error');
      if (error) {
        const errorDescription = searchParams.get('error_description') || 'Autorisation refusée';
        console.error('[OAuth Callback] Error from GoCardless:', error, errorDescription);
        setErrorMessage(errorDescription);
        setState('error');
        return;
      }

      if (!code || !stateToken) {
        console.error('[OAuth Callback] Missing code or state');
        setErrorMessage('Paramètres OAuth manquants. Veuillez réessayer.');
        setState('error');
        return;
      }

      try {
        console.log('[OAuth Callback] Processing callback with code and state');
        
        const { data, error: invokeError } = await supabase.functions.invoke(
          'gocardless-oauth-callback',
          { body: { code, state: stateToken } }
        );

        if (invokeError) {
          console.error('[OAuth Callback] Function invoke error:', invokeError);
          setErrorMessage(invokeError.message || 'Erreur lors de la connexion');
          setState('error');
          return;
        }

        if (!data?.success) {
          console.error('[OAuth Callback] Callback failed:', data?.error);
          setErrorMessage(data?.error || 'Erreur lors de la connexion GoCardless');
          setState('error');
          return;
        }

        console.log('[OAuth Callback] Success!', data);
        setState('success');

        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate(`/${companySlug}/admin/settings`, { replace: true });
        }, 2000);

      } catch (err) {
        console.error('[OAuth Callback] Unexpected error:', err);
        setErrorMessage('Une erreur inattendue est survenue');
        setState('error');
      }
    };

    processCallback();
  }, [searchParams, navigate, companySlug]);

  const handleRetry = () => {
    navigate(`/${companySlug}/admin/settings`, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Connexion GoCardless</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {state === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">
                Connexion en cours...
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <p className="text-center font-medium">
                Connexion réussie !
              </p>
              <p className="text-muted-foreground text-center text-sm">
                Votre compte GoCardless est maintenant connecté.
                <br />
                Redirection vers les paramètres...
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center font-medium text-destructive">
                Erreur de connexion
              </p>
              <p className="text-muted-foreground text-center text-sm">
                {errorMessage}
              </p>
              <Button onClick={handleRetry} variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux paramètres
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoCardlessOAuthCallbackPage;

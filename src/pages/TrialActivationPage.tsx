import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import { CheckCircle, AlertCircle, Loader2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TrialActivationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [companyName, setCompanyName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    activateAccount();
  }, [token]);

  const activateAccount = async () => {
    try {
      // Check if token is valid and not expired
      const { data: confirmationData, error: confirmationError } = await supabase
        .from('company_email_confirmations')
        .select(`
          *,
          companies (
            id,
            name,
            plan
          )
        `)
        .eq('token', token)
        .is('confirmed_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (confirmationError || !confirmationData) {
        console.error('Token validation error:', confirmationError);
        setStatus('expired');
        return;
      }

      const company = confirmationData.companies;
      setCompanyName(company?.name || '');
      setAdminEmail(confirmationData.email);

      // Mark token as confirmed
      const { error: updateTokenError } = await supabase
        .from('company_email_confirmations')
        .update({ confirmed_at: new Date().toISOString() })
        .eq('token', token);

      if (updateTokenError) {
        console.error('Error updating token:', updateTokenError);
        throw updateTokenError;
      }

      // Update company to start trial
      const { error: updateCompanyError } = await supabase
        .from('companies')
        .update({
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          account_status: 'trial'
        })
        .eq('id', company?.id);

      if (updateCompanyError) {
        console.error('Error updating company:', updateCompanyError);
        throw updateCompanyError;
      }

      // Send welcome email
      const { error: emailError } = await supabase.functions.invoke('send-trial-welcome-email', {
        body: {
          type: 'welcome',
          companyName: company?.name,
          adminEmail: confirmationData.email,
          adminFirstName: localStorage.getItem('pendingFirstName') || '',
          adminLastName: localStorage.getItem('pendingLastName') || '',
        }
      });

      if (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the activation for email errors
      }

      // Clear pending registration data
      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('pendingCompanyName');
      localStorage.removeItem('pendingFirstName');
      localStorage.removeItem('pendingLastName');

      setStatus('success');
      toast.success("Compte activé avec succès ! Bienvenue sur Leazr 🎉");

    } catch (error: any) {
      console.error('Activation error:', error);
      setStatus('error');
      toast.error("Erreur lors de l'activation du compte");
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (status === 'loading') {
    return (
      <Container className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Activation en cours...</h3>
            <p className="text-sm text-muted-foreground text-center">
              Nous activons votre compte et préparons votre essai gratuit.
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (status === 'expired') {
    return (
      <Container className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-800">Lien expiré</CardTitle>
            <CardDescription>
              Ce lien d'activation a expiré ou est invalide.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Les liens d'activation expirent après 24 heures pour des raisons de sécurité.
            </p>
            <Button onClick={() => navigate('/signup')} className="w-full">
              Créer un nouveau compte
            </Button>
            <Button onClick={handleGoToLogin} variant="outline" className="w-full">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-800">Erreur d'activation</CardTitle>
            <CardDescription>
              Une erreur est survenue lors de l'activation de votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Veuillez contacter notre support ou réessayer de vous inscrire.
            </p>
            <Button onClick={() => navigate('/signup')} className="w-full">
              Réessayer l'inscription
            </Button>
            <Button onClick={handleGoToLogin} variant="outline" className="w-full">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Success state
  return (
    <Container className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            🎉 Compte activé !
          </CardTitle>
          <CardDescription className="text-base">
            Bienvenue sur Leazr, {companyName} !
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-start gap-3 mb-4">
              <Rocket className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Votre essai gratuit de 14 jours est maintenant actif !
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Profitez de toutes les fonctionnalités de Leazr sans engagement jusqu'au{" "}
                  <strong>{new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>CRM complet</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Calculs automatisés</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Gestion contrats</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Support inclus</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              📧 <strong>Email de bienvenue envoyé !</strong> Vérifiez votre boîte mail ({adminEmail}) 
              pour les détails de connexion et le guide de démarrage.
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleGoToDashboard} className="w-full" size="lg">
              <Rocket className="mr-2 h-5 w-5" />
              Accéder à mon espace Leazr
            </Button>
            
            <Button onClick={handleGoToLogin} variant="outline" className="w-full">
              Se connecter plus tard
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Vous recevrez des notifications avant la fin de votre période d'essai
          </div>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TrialActivationPage;
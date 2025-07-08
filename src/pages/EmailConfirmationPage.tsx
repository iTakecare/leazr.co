import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import { Mail, Clock, RefreshCw, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailConfirmationPageProps {
  email?: string;
  companyName?: string;
}

const EmailConfirmationPage: React.FC<EmailConfirmationPageProps> = ({ 
  email = localStorage.getItem('pendingEmail') || '',
  companyName = localStorage.getItem('pendingCompanyName') || ''
}) => {
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Aucune adresse email trouvée");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-trial-welcome-email', {
        body: {
          type: 'confirmation',
          adminEmail: email,
          companyName: companyName,
          adminFirstName: localStorage.getItem('pendingFirstName') || '',
          adminLastName: localStorage.getItem('pendingLastName') || '',
        }
      });

      if (error) throw error;

      toast.success("Email de confirmation renvoyé avec succès !");
    } catch (error: any) {
      console.error("Error resending email:", error);
      toast.error("Erreur lors du renvoi de l'email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Container className="flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Vérifiez votre email</CardTitle>
          <CardDescription className="text-base">
            Un email de confirmation a été envoyé à{" "}
            <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Inscription réussie pour {companyName}
                </h3>
                <p className="text-sm text-gray-600">
                  Votre essai gratuit de 14 jours vous attend ! Cliquez sur le lien dans l'email pour l'activer.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>L'email peut prendre quelques minutes à arriver</span>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Email non reçu ?</strong> Vérifiez :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Votre dossier spam/indésirables</li>
                <li>Que l'adresse {email} est correcte</li>
                <li>Votre connexion internet</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleResendEmail}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Renvoyer l'email
                </>
              )}
            </Button>

            <div className="text-center">
              <a 
                href="/login" 
                className="text-sm text-primary hover:underline"
              >
                Retour à la connexion
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EmailConfirmationPage;
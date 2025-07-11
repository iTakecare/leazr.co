import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Container from '@/components/layout/Container';
import { Mail, ArrowLeft } from 'lucide-react';

const ActivationSent = () => {
  const location = useLocation();
  const { email, companyName } = location.state || {};

  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-5rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Vérifiez votre email</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Nous avons envoyé un lien d'activation à
          </p>
          
          {email && (
            <p className="font-semibold text-foreground break-words">
              {email}
            </p>
          )}
          
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Prochaines étapes :</strong>
            </p>
            <ol className="text-left space-y-1 list-decimal list-inside">
              <li>Ouvrez votre boîte email</li>
              <li>Cliquez sur le lien d'activation</li>
              <li>Connectez-vous à {companyName || 'votre compte'}</li>
            </ol>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Le lien d'activation expire dans 24 heures pour des raisons de sécurité.
          </div>
          
          <div className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas reçu l'email ? Vérifiez vos spams ou contactez le support.
            </p>
            
            <Button asChild variant="outline" className="w-full">
              <Link to="/login" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ActivationSent;
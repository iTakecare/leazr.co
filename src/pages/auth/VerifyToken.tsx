import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Container from '@/components/layout/Container';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { toast } from 'sonner';

const VerifyToken = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyToken, loading } = useCustomAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Token manquant dans l\'URL');
      return;
    }

    handleTokenVerification(token);
  }, [searchParams]);

  const handleTokenVerification = async (token: string) => {
    try {
      setStatus('loading');
      
      const result = await verifyToken({ token });
      
      if (result.success) {
        setStatus('success');
        setMessage(result.data.message);
        setAction(result.data.action);
        
        toast.success(result.data.message);
        
        // Redirect based on action
        setTimeout(() => {
          if (result.data.action === 'account_activated') {
            navigate('/login', { 
              state: { 
                message: 'Votre compte est maintenant actif ! Vous pouvez vous connecter.' 
              } 
            });
          } else if (result.data.action === 'email_verified') {
            navigate('/login', { 
              state: { 
                message: 'Votre email a été vérifié avec succès !' 
              } 
            });
          }
        }, 2000);
      } else {
        setStatus('error');
        setMessage(result.error || 'Erreur lors de la vérification');
        toast.error(result.error || 'Erreur lors de la vérification');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setStatus('error');
      setMessage('Erreur de connexion');
      toast.error('Erreur de connexion');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Vérification en cours...';
      case 'success':
        return action === 'account_activated' ? 'Compte activé !' : 'Email vérifié !';
      case 'error':
        return 'Erreur de vérification';
    }
  };

  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-5rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {getStatusTitle()}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {message}
          </p>
          
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
              {action === 'account_activated' && (
                <p>Redirection vers la page de connexion dans quelques secondes...</p>
              )}
              {action === 'email_verified' && (
                <p>Votre email a été vérifié avec succès !</p>
              )}
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                <p>Le lien peut avoir expiré ou être invalide.</p>
              </div>
              
              <Button 
                onClick={() => navigate('/login')} 
                variant="outline" 
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </div>
          )}
          
          {status === 'loading' && (
            <div className="text-sm text-muted-foreground">
              Veuillez patienter pendant que nous vérifions votre demande...
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default VerifyToken;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';


interface DeploymentCheck {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
}

export const DeploymentStatus = () => {
  const [checks, setChecks] = useState<DeploymentCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const runDeploymentChecks = async () => {
    setIsChecking(true);
    const newChecks: DeploymentCheck[] = [];

    // Vérifier la détection de sous-domaine
    const hostname = window.location.hostname;
    const isSubdomain = hostname.split('.').length > 2 && hostname !== 'www.leazr.co';
    
    newChecks.push({
      name: 'Détection de sous-domaine',
      status: isSubdomain ? 'success' : 'warning',
      message: isSubdomain 
        ? `Sous-domaine détecté: ${hostname.split('.')[0]}` 
        : 'Domaine principal (pas de sous-domaine)'
    });

    // Vérifier la détection d'entreprise (désactivé - système de slug utilisé)
    newChecks.push({
      name: 'Système de détection',
      status: 'success',
      message: 'Système de slug activé'
    });

    // Vérifier les variables d'environnement
    const hasSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    newChecks.push({
      name: 'Configuration Supabase',
      status: hasSupabaseUrl ? 'success' : 'error',
      message: hasSupabaseUrl ? 'Variables d\'environnement configurées' : 'Variables d\'environnement manquantes'
    });

    // Vérifier l'Edge Function
    try {
      const response = await fetch('/.netlify/functions/detect-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin })
      });
      
      newChecks.push({
        name: 'Edge Function',
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'Edge Function opérationnelle' : 'Edge Function inaccessible'
      });
    } catch (err) {
      newChecks.push({
        name: 'Edge Function',
        status: 'error',
        message: 'Impossible de contacter l\'Edge Function'
      });
    }

    // Vérifier le SSL
    const isHTTPS = window.location.protocol === 'https:';
    newChecks.push({
      name: 'Sécurité SSL',
      status: isHTTPS ? 'success' : 'warning',
      message: isHTTPS ? 'SSL activé' : 'SSL non activé (normal en développement)'
    });

    setChecks(newChecks);
    setIsChecking(false);
  };

  useEffect(() => {
    runDeploymentChecks();
  }, []);

  const getStatusIcon = (status: DeploymentCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'loading':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: DeploymentCheck['status']) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      loading: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge className={variants[status]}>
        {status === 'loading' ? 'Vérification...' : status}
      </Badge>
    );
  };

  // Afficher seulement en développement ou si paramètre debug=true
  const showStatus = window.location.hostname === 'localhost' || 
                    window.location.search.includes('debug=true');

  if (!showStatus) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 max-h-96 overflow-auto shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            État du déploiement
            <Button
              variant="ghost"
              size="sm"
              onClick={runDeploymentChecks}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check, index) => (
            <div key={index} className="flex items-start space-x-3">
              {getStatusIcon(check.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{check.name}</p>
                  {getStatusBadge(check.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {check.message}
                </p>
              </div>
            </div>
          ))}
          
          <div className="pt-2 border-t text-xs text-muted-foreground">
            URL: {window.location.hostname}
            <br />
            Méthode: Système de slug
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

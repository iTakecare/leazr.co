
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AmbassadorErrorHandlerProps {
  message: string;
  onRetry?: () => void;
  showDiagnosticInfo?: boolean;
}

const AmbassadorErrorHandler = ({ message, onRetry, showDiagnosticInfo = false }: AmbassadorErrorHandlerProps) => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Test simple d'accès à la table ambassador_clients
      const { data: rlsTestData, error: rlsError } = await supabase
        .from('ambassador_clients')
        .select('id')
        .limit(1);
      
      // Test d'accès à la table ambassadors
      const { data: ambassadorTestData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id, name')
        .limit(1);
      
      setDiagnosticInfo({
        canAccessAmbassadorClients: !rlsError,
        canAccessAmbassadors: !ambassadorError,
        ambassadorClientsError: rlsError ? rlsError.message : null,
        ambassadorsError: ambassadorError ? ambassadorError.message : null,
        ambassadorClientsCount: rlsTestData?.length || 0,
        ambassadorTestCount: ambassadorTestData?.length || 0
      });
      
      if (rlsError) {
        toast.error("Problème d'accès à la table ambassador_clients");
      } else if (ambassadorError) {
        toast.error("Problème d'accès à la table ambassadors");
      } else {
        toast.success("Tests d'accès réussis");
      }
      
    } catch (error) {
      console.error("Erreur lors du diagnostic:", error);
      setDiagnosticInfo({
        canAccessAmbassadorClients: false,
        canAccessAmbassadors: false,
        generalError: error.message || "Erreur inconnue"
      });
      toast.error("Erreur lors du diagnostic");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-medium mb-2">
          Erreur
        </AlertTitle>
        <AlertDescription className="text-sm">
          {message}
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        )}
        
        {showDiagnosticInfo && (
          <Button 
            onClick={runDiagnostics}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <HelpCircle className="h-4 w-4" />
            {isLoading ? "Diagnostic en cours..." : "Exécuter un diagnostic"}
          </Button>
        )}
      </div>
      
      {diagnosticInfo && (
        <div className="mt-6 p-4 bg-muted rounded-md text-xs space-y-2">
          <h3 className="font-medium text-sm">Informations de diagnostic</h3>
          <p>Accès ambassador_clients: {diagnosticInfo.canAccessAmbassadorClients ? "OK" : "Problème"}</p>
          <p>Accès ambassadors: {diagnosticInfo.canAccessAmbassadors ? "OK" : "Problème"}</p>
          <p>Nombre d'enregistrements ambassador_clients: {diagnosticInfo.ambassadorClientsCount || 0}</p>
          <p>Nombre d'enregistrements ambassadors: {diagnosticInfo.ambassadorTestCount || 0}</p>
          
          {diagnosticInfo.ambassadorClientsError && (
            <div className="p-2 bg-destructive/10 rounded text-destructive">
              <p>Erreur ambassador_clients: {diagnosticInfo.ambassadorClientsError}</p>
            </div>
          )}
          
          {diagnosticInfo.ambassadorsError && (
            <div className="p-2 bg-destructive/10 rounded text-destructive">
              <p>Erreur ambassadors: {diagnosticInfo.ambassadorsError}</p>
            </div>
          )}
          
          {diagnosticInfo.generalError && (
            <div className="p-2 bg-destructive/10 rounded text-destructive">
              <p>Erreur générale: {diagnosticInfo.generalError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AmbassadorErrorHandler;

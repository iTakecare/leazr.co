
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase, getAdminSupabaseClient } from '@/integrations/supabase/client';
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
      // Test both client instances
      const regularClient = supabase;
      const adminClient = getAdminSupabaseClient();
      
      // Compare headers between both clients
      const regularHeaders = regularClient?.restUrl ? 'Regular client initialized' : 'Regular client not properly initialized';
      const adminHeaders = 'Admin client initialized with custom auth settings';
      
      // Test admin client capabilities
      let adminTestResult = 'Failed to test';
      try {
        const { data: testData, error: testError } = await adminClient
          .from('clients')
          .select('count(*)')
          .limit(1);
          
        adminTestResult = testError 
          ? `Error: ${testError.message}`
          : `Success: Found ${testData ? JSON.stringify(testData) : 'no data'}`;
      } catch (e) {
        adminTestResult = `Exception: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
      
      // Set diagnostic info
      setDiagnosticInfo({
        regularClient: regularHeaders,
        adminClient: adminHeaders,
        adminClientTest: adminTestResult,
        timestamp: new Date().toISOString()
      });
      
      toast.success("Diagnostics terminés");
    } catch (error) {
      console.error("Erreur durant les diagnostics:", error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setDiagnosticInfo({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur d'autorisation</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{message}</p>
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="flex items-center"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Réessayer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={runDiagnostics}
              disabled={isLoading}
              className="flex items-center"
            >
              <HelpCircle className="h-3 w-3 mr-2" />
              {isLoading ? "Exécution des diagnostics..." : "Exécuter les diagnostics"}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      
      {diagnosticInfo && showDiagnosticInfo && (
        <div className="mt-4 p-4 bg-muted rounded-md border text-xs font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(diagnosticInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AmbassadorErrorHandler;


import React, { useState } from 'react';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase, getAdminSupabaseClient, SERVICE_ROLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
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
      // Show service role key format (not the full key for security)
      const serviceRoleKeyMasked = SERVICE_ROLE_KEY ? 
        `${SERVICE_ROLE_KEY.substring(0, 10)}...${SERVICE_ROLE_KEY.substring(SERVICE_ROLE_KEY.length - 10)}` : 
        'Not defined';
      
      // Test regular client session
      let regularAuthStatus = 'Unknown';
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        regularAuthStatus = sessionData?.session ? 'Active session' : 'No session';
      } catch (e) {
        regularAuthStatus = `Error: ${e.message}`;
      }
      
      // Test admin client capabilities - create new instance each time
      let adminTestResult = 'Failed to test';
      try {
        const adminClient = getAdminSupabaseClient();
        
        console.log('Testing admin client...');
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
        timestamp: new Date().toISOString(),
        supabaseUrl: SUPABASE_URL,
        regularClientSession: regularAuthStatus,
        serviceRoleKeyFormat: serviceRoleKeyMasked,
        adminClientTest: adminTestResult,
        errorContext: message,
        userAgent: navigator.userAgent
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
      
      {diagnosticInfo && (
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

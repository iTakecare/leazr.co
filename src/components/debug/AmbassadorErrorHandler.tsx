
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, HelpCircle, FileDown, Clipboard, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase, getAdminSupabaseClient, SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AmbassadorErrorHandlerProps {
  message: string;
  onRetry?: () => void;
  showDiagnosticInfo?: boolean;
}

const AmbassadorErrorHandler = ({ message, onRetry, showDiagnosticInfo = false }: AmbassadorErrorHandlerProps) => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Show service role key format (not the full key for security)
      const serviceRoleKeyMasked = SERVICE_ROLE_KEY ? 
        `${SERVICE_ROLE_KEY.substring(0, 15)}...${SERVICE_ROLE_KEY.substring(SERVICE_ROLE_KEY.length - 15)}` : 
        'Not defined';
        
      const publishableKeyMasked = SUPABASE_PUBLISHABLE_KEY ? 
        `${SUPABASE_PUBLISHABLE_KEY.substring(0, 15)}...${SUPABASE_PUBLISHABLE_KEY.substring(SUPABASE_PUBLISHABLE_KEY.length - 15)}` : 
        'Not defined';
      
      // Test regular client session
      let regularAuthStatus = 'Unknown';
      let regularClientTest = 'Not tested';
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        regularAuthStatus = sessionData?.session ? 'Active session' : 'No session';
        
        // Test a simple query with regular client
        const { data: testData, error: testError } = await supabase
          .from('clients')
          .select('count(*)')
          .limit(1);
          
        regularClientTest = testError 
          ? `Error: ${testError.message}`
          : `Success: Found ${testData ? JSON.stringify(testData) : 'no data'}`;
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
      
      // Test direct offer retrieval
      let offersTestResult = 'Failed to test';
      try {
        const adminClient = getAdminSupabaseClient();
        const { data: offersData, error: offersError } = await adminClient
          .from('offers')
          .select('count(*)')
          .limit(1);
          
        offersTestResult = offersError 
          ? `Error: ${offersError.message}`
          : `Success: Found ${offersData ? JSON.stringify(offersData) : 'no data'}`;
      } catch (e) {
        offersTestResult = `Exception: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
      
      // Set diagnostic info
      setDiagnosticInfo({
        timestamp: new Date().toISOString(),
        supabaseUrl: SUPABASE_URL,
        regularClientSession: regularAuthStatus,
        regularClientTest: regularClientTest,
        publishableKeyFormat: publishableKeyMasked,
        serviceRoleKeyFormat: serviceRoleKeyMasked,
        adminClientTest: adminTestResult,
        offersTest: offersTestResult,
        errorContext: message,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
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
  
  const copyToClipboard = () => {
    if (diagnosticInfo) {
      navigator.clipboard.writeText(JSON.stringify(diagnosticInfo, null, 2))
        .then(() => {
          setCopied(true);
          toast.success("Informations copiées dans le presse-papiers");
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          toast.error("Erreur lors de la copie dans le presse-papiers");
        });
    }
  };
  
  const downloadDiagnostics = () => {
    if (diagnosticInfo) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diagnosticInfo, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "supabase-diagnostics.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
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
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Informations de diagnostic</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyToClipboard}
                className="flex items-center"
              >
                {copied ? (
                  <Check className="h-3 w-3 mr-2" />
                ) : (
                  <Clipboard className="h-3 w-3 mr-2" />
                )}
                Copier
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadDiagnostics}
                className="flex items-center"
              >
                <FileDown className="h-3 w-3 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-md border text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbassadorErrorHandler;

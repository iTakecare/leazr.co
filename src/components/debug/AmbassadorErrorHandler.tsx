
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, HelpCircle, FileDown, Clipboard, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase, getAdminSupabaseClient, SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AmbassadorErrorHandlerProps {
  message: string;
  onRetry?: () => void;
  showDiagnosticInfo?: boolean;
}

const AmbassadorErrorHandler = ({ message, onRetry, showDiagnosticInfo = false }: AmbassadorErrorHandlerProps) => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("diagnostics");
  const [manualTest, setManualTest] = useState<any>(null);
  const [testRunning, setTestRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log('Vérification des clés API...');
      
      // Masquer les clés pour la sécurité
      const serviceRoleKeyMasked = SERVICE_ROLE_KEY ? 
        `${SERVICE_ROLE_KEY.substring(0, 10)}...${SERVICE_ROLE_KEY.substring(SERVICE_ROLE_KEY.length - 10)}` : 
        'Non définie';
        
      const publishableKeyMasked = SUPABASE_PUBLISHABLE_KEY ? 
        `${SUPABASE_PUBLISHABLE_KEY.substring(0, 10)}...${SUPABASE_PUBLISHABLE_KEY.substring(SUPABASE_PUBLISHABLE_KEY.length - 10)}` : 
        'Non définie';
      
      // Test du client standard
      let regularAuthStatus = 'Inconnu';
      let regularClientTest = 'Non testé';
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        regularAuthStatus = sessionData?.session ? 'Session active' : 'Pas de session';
        if (sessionError) {
          regularAuthStatus = `Erreur de session: ${sessionError.message}`;
        }
        
        // Test d'une requête simple
        const { data: testData, error: testError } = await supabase
          .from('clients')
          .select('id')
          .limit(1);
          
        regularClientTest = testError 
          ? `Erreur: ${testError.message}`
          : `Succès: ${testData?.length || 0} clients trouvés`;
      } catch (e: any) {
        regularAuthStatus = `Erreur: ${e.message}`;
      }
      
      // Création et test d'un client admin
      let adminTestResult = 'Test échoué';
      try {
        const adminClient = getAdminSupabaseClient();
        
        console.log('Test du client admin...');
        const { data: testData, error: testError } = await adminClient
          .from('clients')
          .select('id')
          .limit(1);
          
        adminTestResult = testError 
          ? `Erreur: ${testError.message}`
          : `Succès: ${testData?.length || 0} clients trouvés`;
      } catch (insertError: any) {
        adminTestResult = `Exception: ${insertError instanceof Error 
          ? insertError.message 
          : 'Erreur inconnue'}`;
      }
      
      // Test direct récupération des offres
      let offersTestResult = 'Test échoué';
      try {
        const adminClient = getAdminSupabaseClient();
        const { data: offersData, error: offersError } = await adminClient
          .from('offers')
          .select('id')
          .limit(1);
          
        offersTestResult = offersError 
          ? `Erreur: ${offersError.message}`
          : `Succès: ${offersData?.length || 0} offres trouvées`;
      } catch (e: any) {
        offersTestResult = `Exception: ${e instanceof Error ? e.message : 'Erreur inconnue'}`;
      }
      
      // Créer un objet avec les infos de diagnostic
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
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        keysLengths: {
          SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY?.length || 0,
          SERVICE_ROLE_KEY: SERVICE_ROLE_KEY?.length || 0
        }
      });
      
      toast.success("Diagnostics terminés");
    } catch (error: any) {
      console.error("Erreur durant les diagnostics:", error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setDiagnosticInfo({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const runManualTest = async () => {
    setTestRunning(true);
    setManualTest(null);
    
    try {
      // Création d'un client admin frais
      const adminClient = getAdminSupabaseClient();
      
      // Test du client
      const { data, error } = await adminClient
        .from('clients')
        .select('id')
        .limit(5);
        
      setManualTest({
        timestamp: new Date().toISOString(),
        result: error ? 'error' : 'success',
        data: data,
        error: error ? error.message : null,
        details: error ? JSON.stringify(error, null, 2) : JSON.stringify(data, null, 2)
      });
      
      if (error) {
        toast.error(`Test échoué: ${error.message}`);
      } else {
        toast.success("Test réussi");
      }
    } catch (error: any) {
      console.error("Erreur durant le test manuel:", error);
      setManualTest({
        timestamp: new Date().toISOString(),
        result: 'exception',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        details: error instanceof Error ? error.stack : 'Pas de détails disponibles'
      });
      toast.error(`Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setTestRunning(false);
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
            <Button
              variant="outline"
              size="sm"
              onClick={runManualTest}
              disabled={testRunning}
              className="flex items-center"
            >
              <AlertTriangle className="h-3 w-3 mr-2" />
              {testRunning ? "Test en cours..." : "Test manuel"}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      
      {(diagnosticInfo || manualTest) && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="manualTest">Test manuel</TabsTrigger>
          </TabsList>
          
          <TabsContent value="diagnostics">
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
          </TabsContent>
          
          <TabsContent value="manualTest">
            {manualTest ? (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">
                    Résultat du test manuel
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      manualTest.result === 'success' ? 'bg-green-100 text-green-800' : 
                      manualTest.result === 'error' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {manualTest.result === 'success' ? 'Succès' : 
                       manualTest.result === 'error' ? 'Erreur' : 'Exception'}
                    </span>
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(manualTest, null, 2));
                      toast.success("Résultat copié dans le presse-papiers");
                    }}
                    className="flex items-center"
                  >
                    <Clipboard className="h-3 w-3 mr-2" />
                    Copier
                  </Button>
                </div>
                <div className="p-4 bg-muted rounded-md border text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(manualTest, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Cliquez sur "Test manuel" pour tester directement la connexion à Supabase
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AmbassadorErrorHandler;

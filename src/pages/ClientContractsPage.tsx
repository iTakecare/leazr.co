
import React, { useEffect, useState } from "react";
import { useClientContracts } from "@/hooks/useClientContracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { File, RefreshCw, AlertCircle, Box, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ClientContractsPage = () => {
  const { contracts, loading, error, refresh, debug, clientId } = useClientContracts();
  const params = useParams();
  const urlClientId = params.id;
  const [userData, setUserData] = useState(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState({
    user: null,
    clientInfo: null,
    clientsCount: 0,
    contractsCount: 0,
    matchingContracts: 0
  });

  useEffect(() => {
    // Log diagnostic information when component mounts
    console.log("ClientContractsPage - clientId from params:", urlClientId);
    console.log("ClientContractsPage - clientId from hook:", clientId);
    console.log("ClientContractsPage - Contracts loaded:", contracts?.length || 0);
    
    // Force a refresh if there's a clientId in the URL
    if (urlClientId) {
      console.log("Forcing refresh for specific client:", urlClientId);
      refresh(urlClientId);
    }

    // Get current user data
    const fetchUserData = async () => {
      const { data } = await supabase.auth.getUser();
      setUserData(data?.user || null);
    };
    
    fetchUserData();
  }, [urlClientId, clientId]);

  const handleRefresh = () => {
    toast.info("Actualisation des contrats...");
    refresh(urlClientId);
  };

  const handleDebug = async () => {
    try {
      // Run the debug function from the hook
      if (debug) debug();
      
      // Collect diagnostic information
      const { data: userData } = await supabase.auth.getUser();
      
      // Get client info
      let clientInfo = null;
      if (clientId) {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();
        clientInfo = data;
      }
      
      // Count all clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      // Count all contracts
      const { count: contractsCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true });
      
      // Count matching contracts
      let matchingContracts = 0;
      if (clientId) {
        const { count } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId);
        matchingContracts = count;
      }
      
      // Update state with diagnostic info
      setDiagnosticInfo({
        user: userData?.user || null,
        clientInfo,
        clientsCount: clientsCount || 0,
        contractsCount: contractsCount || 0,
        matchingContracts: matchingContracts || 0
      });
      
      // Open debug dialog
      setDebugOpen(true);
      
      toast.info("Diagnostic terminé, consultez les résultats");
    } catch (error) {
      console.error("Error running diagnostics:", error);
      toast.error("Erreur lors du diagnostic");
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erreur</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
                </Button>
                <Button onClick={handleDebug} variant="secondary">
                  Diagnostic
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6">Mes Contrats</h1>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aucun contrat trouvé</h2>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de contrats actifs.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
                </Button>
                <Button onClick={handleDebug} variant="secondary">
                  Diagnostic
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {clientId && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Informations de connexion</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Utilisateur connecté: {userData?.email || "Non disponible"}
            </p>
            <p className="text-sm text-muted-foreground">
              ID client: {clientId}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Contrats</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button onClick={handleDebug} variant="ghost" size="sm">
            Diagnostic
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{contract.equipment_description || "Équipement"}</CardTitle>
                  <CardDescription>
                    Contrat avec {contract.leaser_name}
                  </CardDescription>
                </div>
                {contract.leaser_logo && (
                  <img 
                    src={contract.leaser_logo} 
                    alt={contract.leaser_name} 
                    className="h-8 object-contain" 
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut:</span>
                  <span className="font-medium capitalize">
                    {contract.status === "active" 
                      ? "Actif" 
                      : contract.status === "contract_sent" 
                        ? "Contrat envoyé" 
                        : contract.status === "equipment_ordered"
                          ? "Équipement commandé"
                          : contract.status === "delivered"
                            ? "Livré"
                            : contract.status === "completed"
                              ? "Terminé"
                              : contract.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loyer mensuel:</span>
                  <span className="font-medium">{formatCurrency(contract.monthly_payment)}</span>
                </div>
                {contract.tracking_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Numéro de suivi:</span>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">{contract.tracking_number}</span>
                      {contract.delivery_carrier === "bpost" && (
                        <a 
                          href={`https://track.bpost.be/btr/web/#/search?itemCode=${contract.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {contract.estimated_delivery && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison estimée:</span>
                    <span className="font-medium">{contract.estimated_delivery}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Créé le {new Date(contract.created_at).toLocaleDateString()}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Diagnostic Dialog */}
      <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Diagnostic des contrats client</DialogTitle>
            <DialogDescription>
              Informations détaillées sur la connexion entre l'utilisateur et les contrats
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Informations utilisateur</h3>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> {diagnosticInfo.user?.email || "Non disponible"}</p>
                <p><strong>ID utilisateur:</strong> {diagnosticInfo.user?.id || "Non disponible"}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Informations client</h3>
              {diagnosticInfo.clientInfo ? (
                <div className="text-sm space-y-1">
                  <p><strong>Nom client:</strong> {diagnosticInfo.clientInfo.name}</p>
                  <p><strong>ID client:</strong> {diagnosticInfo.clientInfo.id}</p>
                  <p><strong>Email client:</strong> {diagnosticInfo.clientInfo.email || "Non disponible"}</p>
                  <p><strong>ID utilisateur associé:</strong> {diagnosticInfo.clientInfo.user_id || "Aucun"}</p>
                  <p><strong>Statut:</strong> {diagnosticInfo.clientInfo.status || "Non défini"}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune information client trouvée</p>
              )}
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Statistiques</h3>
              <div className="text-sm space-y-1">
                <p><strong>Nombre total de clients:</strong> {diagnosticInfo.clientsCount}</p>
                <p><strong>Nombre total de contrats:</strong> {diagnosticInfo.contractsCount}</p>
                <p><strong>Contrats associés à ce client:</strong> {diagnosticInfo.matchingContracts}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-medium mb-2">Liens directs</h3>
              <div className="text-sm space-y-2">
                <p>Accéder à la page des contrats avec l'ID client:</p>
                <code className="block p-2 bg-muted rounded text-xs overflow-x-auto">
                  {window.location.origin}/client/contracts?id={clientId || "[id_client]"}
                </code>
                
                {diagnosticInfo.clientInfo && (
                  <>
                    <p className="mt-2">Lien vers la page client dans l'interface d'administration:</p>
                    <code className="block p-2 bg-muted rounded text-xs overflow-x-auto">
                      {window.location.origin}/clients/{diagnosticInfo.clientInfo.id}
                    </code>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={() => setDebugOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientContractsPage;

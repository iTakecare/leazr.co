
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { findClientById } from "@/services/clientService";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SearchIcon, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ClientSearchById = ({ 
  onClientFound, 
  onToggleAmbassadorClients 
}: { 
  onClientFound?: (clientId: string) => void,
  onToggleAmbassadorClients?: (value: boolean) => void
}) => {
  const [clientId, setClientId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!clientId || clientId.trim() === '') {
      toast.error("Veuillez entrer un ID de client valide");
      return;
    }

    setIsSearching(true);
    try {
      const result = await findClientById(clientId.trim());
      setSearchResult(result);
      console.log("Résultat de la recherche:", result);
      
      if (result.exists) {
        toast.success("Client trouvé");
        if (onClientFound) {
          onClientFound(clientId);
        }
      } else {
        toast.error("Client non trouvé");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      toast.error("Erreur lors de la recherche du client");
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewClient = () => {
    if (searchResult?.client?.id) {
      navigate(`/clients/${searchResult.client.id}`);
    }
  };
  
  const handleToggleClientView = () => {
    if (searchResult?.isAmbassadorClient && onToggleAmbassadorClients) {
      onToggleAmbassadorClients(true);
      toast.success("Affichage des clients d'ambassadeurs activé");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Rechercher un client par ID..."
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="flex-grow"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isSearching}
          className="min-w-24"
        >
          {isSearching ? "Recherche..." : (
            <>
              <SearchIcon className="w-4 h-4 mr-2" />
              Rechercher
            </>
          )}
        </Button>
      </div>

      {searchResult && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Résultat de la recherche</CardTitle>
            <CardDescription>
              Informations sur le client recherché
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResult.exists ? (
              <div className="space-y-4">
                <Alert variant={searchResult.isAmbassadorClient ? "warning" : "default"}>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Client trouvé</AlertTitle>
                  <AlertDescription>
                    {searchResult.message}
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{searchResult.client?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nom:</span>
                    <span className="font-medium">{searchResult.client?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{searchResult.client?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Société:</span>
                    <span>{searchResult.client?.company || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut:</span>
                    <Badge variant={searchResult.client?.status === 'active' ? "default" : "secondary"}>
                      {searchResult.client?.status || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant={searchResult.isAmbassadorClient ? "outline" : "secondary"}>
                      {searchResult.isAmbassadorClient ? 'Client Ambassadeur' : 'Client Standard'}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Client non trouvé</AlertTitle>
                <AlertDescription>
                  {searchResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          {searchResult.exists && (
            <CardFooter className="flex justify-end gap-2 pt-2">
              {searchResult.isAmbassadorClient && (
                <Button variant="outline" onClick={handleToggleClientView}>
                  Afficher les clients d'ambassadeurs
                </Button>
              )}
              <Button onClick={handleViewClient}>
                Voir le client
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
};

export default ClientSearchById;

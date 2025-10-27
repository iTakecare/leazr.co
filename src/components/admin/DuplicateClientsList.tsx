import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Mail, Calendar, Building, Merge } from "lucide-react";
import { detectDuplicateClients } from "@/services/clientService";
import { mergeClients } from "@/utils/clientDiagnostics";
import { Client } from "@/types/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DuplicateGroup {
  clients: Client[];
  reason: string;
  confidence: number;
}

const DuplicateClientsList = () => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  const [selectedMerge, setSelectedMerge] = useState<{
    source: string;
    target: string;
    group: DuplicateGroup;
  } | null>(null);

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    setIsLoading(true);
    try {
      const detected = await detectDuplicateClients();
      setDuplicates(detected);
      
      if (detected.length === 0) {
        toast.success("Aucun doublon détecté dans votre CRM");
      } else {
        toast.info(`${detected.length} groupe(s) de doublons détecté(s)`);
      }
    } catch (error) {
      console.error("Erreur lors de la détection des doublons:", error);
      toast.error("Erreur lors de la détection des doublons");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedMerge) return;

    setIsMerging(true);
    try {
      await mergeClients(selectedMerge.source, selectedMerge.target);
      
      toast.success("Clients fusionnés avec succès");
      
      // Recharger les doublons
      await loadDuplicates();
      setSelectedMerge(null);
    } catch (error) {
      console.error("Erreur lors de la fusion:", error);
      toast.error("Erreur lors de la fusion des clients");
    } finally {
      setIsMerging(false);
    }
  };

  const openMergeDialog = (sourceId: string, targetId: string, group: DuplicateGroup) => {
    setSelectedMerge({ source: sourceId, target: targetId, group });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyse des doublons en cours...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (duplicates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun doublon détecté</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Votre CRM est propre ! Aucun client en doublon n'a été trouvé.
          </p>
          <Button onClick={loadDuplicates} variant="outline" className="mt-4">
            Réanalyser
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{duplicates.length} groupe(s) de doublons</h2>
            <p className="text-sm text-muted-foreground">
              Sélectionnez les clients à fusionner
            </p>
          </div>
          <Button onClick={loadDuplicates} variant="outline">
            Réanalyser
          </Button>
        </div>

        {duplicates.map((group, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Groupe {index + 1}</CardTitle>
                  <CardDescription>{group.reason}</CardDescription>
                </div>
                <Badge variant="secondary">{group.clients.length} clients</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.clients.map((client, clientIndex) => (
                  <div
                    key={client.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base">{client.name}</h4>
                          {clientIndex === 0 && (
                            <Badge variant="default">À conserver</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {client.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.company && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building className="h-4 w-4" />
                              <span>{client.company}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Créé le{' '}
                              {format(new Date(client.created_at || new Date()), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {clientIndex > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openMergeDialog(client.id, group.clients[0].id, group)}
                          className="ml-4"
                        >
                          <Merge className="h-4 w-4 mr-2" />
                          Fusionner vers #{1}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!selectedMerge} onOpenChange={() => setSelectedMerge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la fusion des clients</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Cette action va fusionner les deux clients suivants :
              </p>
              {selectedMerge && (
                <div className="space-y-2 bg-muted p-3 rounded-md">
                  <div>
                    <strong>Client source (sera supprimé) :</strong>
                    <p className="text-sm">
                      {selectedMerge.group.clients.find(c => c.id === selectedMerge.source)?.name}
                    </p>
                  </div>
                  <div>
                    <strong>Client cible (sera conservé) :</strong>
                    <p className="text-sm">
                      {selectedMerge.group.clients.find(c => c.id === selectedMerge.target)?.name}
                    </p>
                  </div>
                </div>
              )}
              <p className="text-warning">
                Toutes les demandes, contrats et collaborateurs du client source seront transférés 
                vers le client cible. Cette action est irréversible.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMerge}
              disabled={isMerging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isMerging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fusion en cours...
                </>
              ) : (
                <>
                  <Merge className="h-4 w-4 mr-2" />
                  Confirmer la fusion
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DuplicateClientsList;


import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eraser, Trash2 } from "lucide-react";
import { cleanupDuplicateClients } from "@/utils/clientUserAssociation";
import { useAuth } from "@/context/AuthContext";
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";

interface ClientCleanupButtonProps {
  refreshClients?: () => Promise<void>;
  clientId?: string; // ID du client à supprimer (configurable)
}

export default function ClientCleanupButton({ refreshClients, clientId }: ClientCleanupButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Fonction pour supprimer un client spécifique
  const deleteSpecificClient = async () => {
    if (!clientId) {
      toast.error("Aucun client spécifié pour la suppression");
      return;
    }
    
    setIsDeleting(true);
    try {
      // Utiliser le client admin pour éviter les problèmes de RLS
      const adminClient = getAdminSupabaseClient();
      
      // 1. Mettre à null le client_id dans la table profiles où il est référencé
      const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({ client_id: null })
        .eq('client_id', clientId);
        
      if (profileUpdateError) {
        console.error("Erreur lors de la mise à jour des profils:", profileUpdateError);
        toast.error("Erreur lors de la suppression des références du client");
        setIsDeleting(false);
        return;
      }

      // 2. Supprimer toutes les références dans les tables liées (si nécessaire)
      // Par exemple, supprimer les entrées dans collaborators
      const { error: collabDeleteError } = await adminClient
        .from('collaborators')
        .delete()
        .eq('client_id', clientId);
        
      if (collabDeleteError) {
        console.error("Erreur lors de la suppression des collaborateurs:", collabDeleteError);
        // On continue malgré cette erreur
      }

      // 3. Maintenant supprimer le client
      const { error: deleteError } = await adminClient
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (deleteError) {
        console.error("Erreur lors de la suppression du client:", deleteError);
        toast.error(`Échec de la suppression du client: ${deleteError.message}`);
        setIsDeleting(false);
        return;
      }

      toast.success("Client problématique supprimé avec succès");
      
      // Rafraîchir la liste des clients si la fonction est disponible
      if (refreshClients) {
        await refreshClients();
      }
    } catch (error) {
      console.error("Exception lors de la suppression du client:", error);
      toast.error("Erreur inattendue lors de la suppression du client");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-md">
      <Button 
        variant="destructive" 
        size="sm"
        onClick={deleteSpecificClient}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isDeleting ? "Suppression..." : "Supprimer le client problématique"}
      </Button>
    </div>
  );
}

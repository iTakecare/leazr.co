
import React from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
import { cleanupDuplicateClients } from "@/utils/clientUserAssociation";
import { useAuth } from "@/context/AuthContext";

export default function ClientCleanupButton() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { isAdmin } = useAuth();
  
  if (!isAdmin()) return null;
  
  const handleCleanup = async () => {
    try {
      setIsProcessing(true);
      await cleanupDuplicateClients();
      toast.success("Nettoyage des doublons effectué avec succès");
      setIsProcessing(false);
    } catch (error) {
      console.error("Erreur lors du nettoyage des doublons:", error);
      toast.error("Erreur lors du nettoyage des doublons");
      setIsProcessing(false);
    }
  };
  
  return (
    <Button 
      onClick={handleCleanup} 
      variant="outline" 
      size="sm" 
      className="ml-2"
      disabled={isProcessing}
    >
      <Eraser className="h-4 w-4 mr-2" />
      {isProcessing ? "Nettoyage en cours..." : "Nettoyer les doublons"}
    </Button>
  );
}

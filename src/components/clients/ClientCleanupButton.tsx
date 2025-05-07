
import React from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eraser } from "lucide-react";
import { cleanupDuplicateClients } from "@/utils/clientUserAssociation";
import { useAuth } from "@/context/AuthContext";

interface ClientCleanupButtonProps {
  refreshClients?: () => Promise<void>;
}

export default function ClientCleanupButton({ refreshClients }: ClientCleanupButtonProps) {
  // Retourner null pour ne pas rendre le bouton
  return null;
}

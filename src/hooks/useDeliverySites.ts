import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDeliverySitesByClientId,
  createDeliverySite,
  updateDeliverySite,
  deleteDeliverySite,
  setDeliverySiteAsDefault
} from "@/services/deliverySiteService";
import { DeliverySite, CreateDeliverySiteData } from "@/types/deliverySite";
import { toast } from "sonner";

export const useDeliverySites = (clientId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['delivery-sites', clientId];

  const {
    data: deliverySites = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => clientId ? getDeliverySitesByClientId(clientId) : Promise.resolve([]),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: createDeliverySite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Site de livraison créé avec succès");
    },
    onError: (error: any) => {
      console.error('Error creating delivery site:', error);
      toast.error("Erreur lors de la création du site de livraison");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DeliverySite> }) =>
      updateDeliverySite(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Site de livraison mis à jour avec succès");
    },
    onError: (error: any) => {
      console.error('Error updating delivery site:', error);
      toast.error("Erreur lors de la mise à jour du site de livraison");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeliverySite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Site de livraison supprimé avec succès");
    },
    onError: (error: any) => {
      console.error('Error deleting delivery site:', error);
      toast.error("Erreur lors de la suppression du site de livraison");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      setDeliverySiteAsDefault(id, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Site de livraison défini comme défaut");
    },
    onError: (error: any) => {
      console.error('Error setting default delivery site:', error);
      toast.error("Erreur lors de la définition du site par défaut");
    },
  });

  return {
    deliverySites,
    isLoading,
    error,
    refetch,
    createDeliverySite: createMutation.mutate,
    updateDeliverySite: updateMutation.mutate,
    deleteDeliverySite: deleteMutation.mutate,
    setDeliverySiteAsDefault: setDefaultMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
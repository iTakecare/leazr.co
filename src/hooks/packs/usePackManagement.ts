import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { 
  getPacks, 
  createPack, 
  updatePack, 
  deletePack, 
  duplicatePack 
} from "@/services/packService";
import { ProductPack, CreatePackData } from "@/types/pack";

export const usePackManagement = () => {
  const queryClient = useQueryClient();
  const [isCreatePackOpen, setIsCreatePackOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<ProductPack | null>(null);

  // Fetch packs query
  const {
    data: packs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["packs"],
    queryFn: getPacks,
    staleTime: 0,
    gcTime: 0,
  });

  // Create pack mutation
  const createPackMutation = useMutation({
    mutationFn: createPack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs"] });
      toast.success("Pack créé avec succès");
      setIsCreatePackOpen(false);
    },
    onError: (error: any) => {
      console.error("Error creating pack:", error);
      toast.error("Erreur lors de la création du pack");
    },
  });

  // Update pack mutation
  const updatePackMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePackData> }) =>
      updatePack(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs"] });
      toast.success("Pack mis à jour avec succès");
      setEditingPack(null);
    },
    onError: (error: any) => {
      console.error("Error updating pack:", error);
      toast.error("Erreur lors de la mise à jour du pack");
    },
  });

  // Delete pack mutation
  const deletePackMutation = useMutation({
    mutationFn: deletePack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs"] });
      toast.success("Pack supprimé avec succès");
    },
    onError: (error: any) => {
      console.error("Error deleting pack:", error);
      toast.error("Erreur lors de la suppression du pack");
    },
  });

  // Duplicate pack mutation
  const duplicatePackMutation = useMutation({
    mutationFn: duplicatePack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs"] });
      toast.success("Pack dupliqué avec succès");
    },
    onError: (error: any) => {
      console.error("Error duplicating pack:", error);
      toast.error("Erreur lors de la duplication du pack");
    },
  });

  // Action handlers
  const handleCreatePack = () => {
    setIsCreatePackOpen(true);
  };

  const handleEditPack = (pack: ProductPack) => {
    setEditingPack(pack);
  };

  const handleDeletePack = (pack: ProductPack) => {
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer le pack "${pack.name}" ?\n\nCette action est irréversible et supprimera également tous les produits du pack.`;
    if (window.confirm(confirmMessage)) {
      deletePackMutation.mutate(pack.id);
    }
  };

  const handleDuplicatePack = (pack: ProductPack) => {
    duplicatePackMutation.mutate(pack.id);
  };

  const handleTogglePackStatus = (pack: ProductPack) => {
    updatePackMutation.mutate({
      id: pack.id,
      data: { is_active: !pack.is_active }
    });
  };

  const handleTogglePackFeatured = (pack: ProductPack) => {
    updatePackMutation.mutate({
      id: pack.id,
      data: { is_featured: !pack.is_featured }
    });
  };

  return {
    // Data
    packs,
    isLoading,
    error,
    
    // UI State
    isCreatePackOpen,
    setIsCreatePackOpen,
    editingPack,
    setEditingPack,
    
    // Mutations
    createPackMutation,
    updatePackMutation,
    deletePackMutation,
    duplicatePackMutation,
    
    // Handlers
    handleCreatePack,
    handleEditPack,
    handleDeletePack,
    handleDuplicatePack,
    handleTogglePackStatus,
    handleTogglePackFeatured,
  };
};
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { ProductPack, CreatePackItemData, PackCalculation } from "@/types/pack";
import { createPack, updatePack } from "@/services/packService";
import { createPackItems, deletePackItem, updatePackItemsPositions } from "@/services/packItemService";
import { calculatePackTotals } from "@/services/packService";

export interface PackItemFormData extends CreatePackItemData {
  id?: string; // For editing existing items
  product: Product;
  isNew?: boolean;
}

export const usePackCreator = (editingPack?: ProductPack | null) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [packData, setPackData] = useState({
    name: editingPack?.name || "",
    description: editingPack?.description || "",
    image_url: editingPack?.image_url || "",
    is_active: editingPack?.is_active ?? true,
    is_featured: editingPack?.is_featured ?? false,
    admin_only: editingPack?.admin_only ?? false,
    valid_from: editingPack?.valid_from ? new Date(editingPack.valid_from) : undefined,
    valid_to: editingPack?.valid_to ? new Date(editingPack.valid_to) : undefined,
  });
  
  const [packItems, setPackItems] = useState<PackItemFormData[]>(() => {
    if (editingPack?.items) {
      return editingPack.items.map((item, index) => ({
        id: item.id,
        product_id: item.product_id,
        variant_price_id: item.variant_price_id,
        quantity: item.quantity,
        unit_purchase_price: item.unit_purchase_price,
        unit_monthly_price: item.unit_monthly_price,
        margin_percentage: item.margin_percentage,
        custom_price_override: item.custom_price_override,
        position: item.position,
        product: item.product as Product,
        isNew: false,
      }));
    }
    return [];
  });

  const [calculations, setCalculations] = useState<PackCalculation>(() => {
    // Convert PackItemFormData to ProductPackItem format for calculation
    const itemsForCalculation = packItems.map(item => ({
      id: item.id || `temp-${Math.random()}`,
      pack_id: editingPack?.id || '',
      product_id: item.product_id,
      variant_price_id: item.variant_price_id,
      quantity: item.quantity,
      unit_purchase_price: item.unit_purchase_price,
      unit_monthly_price: item.unit_monthly_price,
      margin_percentage: item.margin_percentage,
      custom_price_override: item.custom_price_override || false,
      position: item.position,
      created_at: new Date().toISOString(),
    }));
    return calculatePackTotals(itemsForCalculation);
  });

  // Update calculations when items change
  const updateCalculations = useCallback(() => {
    const itemsForCalculation = packItems.map(item => ({
      id: item.id || `temp-${Math.random()}`,
      pack_id: editingPack?.id || '',
      product_id: item.product_id,
      variant_price_id: item.variant_price_id,
      quantity: item.quantity,
      unit_purchase_price: item.unit_purchase_price,
      unit_monthly_price: item.unit_monthly_price,
      margin_percentage: item.margin_percentage,
      custom_price_override: item.custom_price_override || false,
      position: item.position,
      created_at: new Date().toISOString(),
    }));
    const newCalculations = calculatePackTotals(itemsForCalculation);
    setCalculations(newCalculations);
  }, [packItems, editingPack?.id]);

  // Create pack mutation
  const createPackMutation = useMutation({
    mutationFn: createPack,
    onSuccess: async (newPack) => {
      if (packItems.length > 0) {
        const itemsData = packItems.map((item, index) => ({
          pack_id: newPack.id,
          product_id: item.product_id,
          variant_price_id: item.variant_price_id,
          quantity: item.quantity,
          unit_purchase_price: item.unit_purchase_price,
          unit_monthly_price: item.unit_monthly_price,
          margin_percentage: item.margin_percentage,
          custom_price_override: item.custom_price_override,
          position: index,
        }));

        await createPackItems(itemsData);
      }
      
      queryClient.invalidateQueries({ queryKey: ["packs"] });
      toast.success("Pack créé avec succès");
      return newPack;
    },
    onError: (error: any) => {
      console.error("Error creating pack:", error);
      toast.error("Erreur lors de la création du pack");
    },
  });

  // Update pack mutation
  const updatePackMutation = useMutation({
    mutationFn: async () => {
      if (!editingPack) throw new Error("No pack to update");
      
      // Update pack basic info
      await updatePack(editingPack.id, packData);
      
      // Handle items updates
      const existingItems = packItems.filter(item => !item.isNew && item.id);
      const newItems = packItems.filter(item => item.isNew || !item.id);
      const existingItemIds = existingItems.map(item => item.id).filter(Boolean);
      
      // Delete items that are no longer in the list
      const originalItemIds = editingPack.items?.map(item => item.id) || [];
      const itemsToDelete = originalItemIds.filter(id => !existingItemIds.includes(id));
      
      for (const itemId of itemsToDelete) {
        await deletePackItem(itemId);
      }
      
      // Create new items
      if (newItems.length > 0) {
        const itemsData = newItems.map((item, index) => ({
          pack_id: editingPack.id,
          product_id: item.product_id,
          variant_price_id: item.variant_price_id,
          quantity: item.quantity,
          unit_purchase_price: item.unit_purchase_price,
          unit_monthly_price: item.unit_monthly_price,
          margin_percentage: item.margin_percentage,
          custom_price_override: item.custom_price_override,
          position: existingItems.length + index,
        }));

        await createPackItems(itemsData);
      }
      
      // Update positions of all items
      const positionUpdates = packItems
        .filter(item => item.id)
        .map((item, index) => ({
          id: item.id!,
          position: index,
        }));
      
      if (positionUpdates.length > 0) {
        await updatePackItemsPositions(positionUpdates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs"] });
      toast.success("Pack mis à jour avec succès");
    },
    onError: (error: any) => {
      console.error("Error updating pack:", error);
      toast.error("Erreur lors de la mise à jour du pack");
    },
  });

  // Helper functions
  const addPackItem = (item: PackItemFormData) => {
    setPackItems(prev => [...prev, { ...item, position: prev.length, isNew: true }]);
  };

  const updatePackItem = (index: number, updates: Partial<PackItemFormData>) => {
    setPackItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const removePackItem = (index: number) => {
    setPackItems(prev => prev.filter((_, i) => i !== index));
  };

  const reorderPackItems = (startIndex: number, endIndex: number) => {
    setPackItems(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Update positions
      return result.map((item, index) => ({ ...item, position: index }));
    });
  };

  const updatePackData = (updates: Partial<typeof packData>) => {
    setPackData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);
  const goToStep = (step: number) => setCurrentStep(step);

  const resetForm = () => {
    setCurrentStep(0);
    setPackData({
      name: "",
      description: "",
      image_url: "",
      is_active: true,
      is_featured: false,
      admin_only: false,
      valid_from: undefined,
      valid_to: undefined,
    });
    setPackItems([]);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0: // General info
        return packData.name.trim().length > 0;
      case 1: // Products selection
        return packItems.length > 0;
      case 2: // Price configuration
        return true;
      default:
        return false;
    }
  };

  const canSubmit = () => {
    return packData.name.trim().length > 0 && packItems.length > 0;
  };

  // Update calculations when items change
  useCallback(() => {
    updateCalculations();
  }, [updateCalculations]);

  return {
    // State
    currentStep,
    packData,
    packItems,
    calculations,
    
    // Mutations
    createPackMutation,
    updatePackMutation,
    
    // Actions
    addPackItem,
    updatePackItem,
    removePackItem,
    reorderPackItems,
    updatePackData,
    updateCalculations,
    
    // Navigation
    nextStep,
    prevStep,
    goToStep,
    resetForm,
    
    // Validation
    canGoNext,
    canSubmit,
    
    // Flags
    isEditing: !!editingPack,
  };
};

import { supabase } from "@/integrations/supabase/client";
import { Leaser } from '@/types/leaser';
import { toast } from "sonner";

// Function to get all leasers
export const getLeasers = async (): Promise<Leaser[]> => {
  try {
    const { data, error } = await supabase
      .from('leasers')
      .select('*');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching leasers:', error);
    toast.error('Erreur lors de la récupération des partenaires financiers');
    throw error;
  }
};

// Function to add a new leaser
export const addLeaser = async (leaserData: Omit<Leaser, 'id'>): Promise<Leaser> => {
  try {
    const { data, error } = await supabase
      .from('leasers')
      .insert(leaserData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding leaser:', error);
    toast.error('Erreur lors de l\'ajout du partenaire financier');
    throw error;
  }
};

// Function to update an existing leaser
export const updateLeaser = async (id: string, leaserData: Omit<Leaser, 'id'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leasers')
      .update(leaserData)
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating leaser:', error);
    toast.error('Erreur lors de la mise à jour du partenaire financier');
    throw error;
  }
};

// Function to delete a leaser
export const deleteLeaser = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leasers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting leaser:', error);
    toast.error('Erreur lors de la suppression du partenaire financier');
    throw error;
  }
};

// Function to insert default leasers if none exist
export const insertDefaultLeasers = async (): Promise<boolean> => {
  try {
    // First check if any leasers exist
    const { data, error } = await supabase
      .from('leasers')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    // If no leasers exist, insert defaults
    if (!data || data.length === 0) {
      const defaultLeasers = [
        {
          name: 'Grenke Finance',
          description: 'Leasing financier spécialisé en équipement informatique',
          ranges: [
            { min: 0, max: 10000, coefficient: 2.2 },
            { min: 10001, max: 50000, coefficient: 2.1 },
            { min: 50001, max: 999999999, coefficient: 2.0 }
          ]
        },
        {
          name: 'BNP Leasing Solutions',
          description: 'Solutions de financement professionnel',
          ranges: [
            { min: 0, max: 15000, coefficient: 2.3 },
            { min: 15001, max: 75000, coefficient: 2.15 },
            { min: 75001, max: 999999999, coefficient: 2.05 }
          ]
        }
      ];
      
      const { error: insertError } = await supabase
        .from('leasers')
        .insert(defaultLeasers);
      
      if (insertError) throw insertError;
    }
    
    return true;
  } catch (error) {
    console.error('Error inserting default leasers:', error);
    toast.error('Erreur lors de l\'insertion des partenaires financiers par défaut');
    throw error;
  }
};


import { supabase } from "@/integrations/supabase/client";

export const assignITakecareSubscription = async () => {
  try {
    // Check if iTakecare company already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', '%itakecare%')
      .single();

    if (existingCompany) {
      // Update existing company
      const { error } = await supabase
        .from('companies')
        .update({
          plan: 'business',
          is_active: true,
          subscription_ends_at: new Date(2030, 11, 31).toISOString(), // 31 Dec 2030
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCompany.id);

      if (error) throw error;
      console.log('iTakecare subscription updated successfully');
    } else {
      // Create new iTakecare company
      const { error } = await supabase
        .from('companies')
        .insert({
          name: 'iTakecare',
          plan: 'business',
          is_active: true,
          subscription_ends_at: new Date(2030, 11, 31).toISOString(), // 31 Dec 2030
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log('iTakecare company created with Business subscription');
    }

    return { success: true };
  } catch (error) {
    console.error('Error assigning iTakecare subscription:', error);
    return { success: false, error };
  }
};

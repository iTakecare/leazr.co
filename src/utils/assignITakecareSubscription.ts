
import { supabase } from "@/integrations/supabase/client";

export const assignITakecareSubscription = async () => {
  try {
    console.log('Checking and assigning iTakecare subscription...');
    
    // Check if iTakecare company already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', '%itakecare%')
      .single();

    let companyId;

    if (existingCompany) {
      console.log('iTakecare company found, updating subscription...');
      companyId = existingCompany.id;
      
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
      console.log('iTakecare company not found, creating new one...');
      // Create new iTakecare company
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({
          name: 'iTakecare',
          plan: 'business',
          is_active: true,
          subscription_ends_at: new Date(2030, 11, 31).toISOString(), // 31 Dec 2030
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      companyId = newCompany.id;
      console.log('iTakecare company created with Business subscription');
    }

    // Now ensure the hello@itakecare.be user is associated with this company
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        company_id: companyId,
        role: 'admin'
      })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);

    if (profileError) {
      console.error('Error updating user profile:', profileError);
    } else {
      console.log('User profile updated with iTakecare company association');
    }

    console.log('iTakecare Business subscription assigned successfully until 2030');
    return { success: true };
  } catch (error) {
    console.error('Error assigning iTakecare subscription:', error);
    return { success: false, error };
  }
};

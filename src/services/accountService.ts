import { supabase } from "@/integrations/supabase/client";

// Creating this type to solve the type error
export type EntityType = "ambassador" | "partner" | "client";

export const createUserAccount = async (id: string, type: EntityType) => {
  const { data, error } = await supabase.functions.invoke('create-user-account', {
    body: { id, type }
  });

  if (error) throw error;
  return data;
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  
  if (error) throw error;
  return data;
};

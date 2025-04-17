
import { supabase } from "@/integrations/supabase/client";

export type PageContent = {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// Récupérer une page par son slug
export const getPageBySlug = async (slug: string): Promise<PageContent | null> => {
  try {
    const { data, error } = await supabase
      .from('pages_cms')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();
    
    if (error) {
      console.error('Erreur lors de la récupération de la page:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception lors de la récupération de la page:', error);
    return null;
  }
};

// Récupérer toutes les pages publiées
export const getAllPublishedPages = async (): Promise<PageContent[]> => {
  try {
    const { data, error } = await supabase
      .from('pages_cms')
      .select('*')
      .eq('is_published', true)
      .order('title');
    
    if (error) {
      console.error('Erreur lors de la récupération des pages:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des pages:', error);
    return [];
  }
};

// Mettre à jour une page
export const updatePage = async (page: Partial<PageContent> & { slug: string }): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pages_cms')
      .update({
        title: page.title,
        content: page.content,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        updated_at: new Date().toISOString()
      })
      .eq('slug', page.slug);
    
    if (error) {
      console.error('Erreur lors de la mise à jour de la page:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception lors de la mise à jour de la page:', error);
    return false;
  }
};

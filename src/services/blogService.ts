
import { supabase } from "@/integrations/supabase/client";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category: string;
  image_url?: string;
  author_name?: string;
  author_role?: string;
  author_avatar?: string;
  read_time?: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

// Récupérer tous les articles publiés
export const getAllBlogPosts = async (): Promise<BlogPost[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_blog_posts')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur lors de la récupération des articles:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des articles:', error);
    return [];
  }
};

// Récupérer les articles par catégorie
export const getBlogPostsByCategory = async (category: string): Promise<BlogPost[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_blog_posts', { category_filter: category });
    
    if (error) {
      console.error('Erreur lors de la récupération des articles par catégorie:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des articles par catégorie:', error);
    return [];
  }
};

// Récupérer un article par son slug
export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_blog_post_by_slug', { post_slug: slug });
    
    if (error) {
      console.error('Erreur lors de la récupération de l\'article:', error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Exception lors de la récupération de l\'article:', error);
    return null;
  }
};

// Récupérer les articles en vedette
export const getFeaturedBlogPosts = async (): Promise<BlogPost[]> => {
  try {
    const { data, error } = await supabase.rpc('get_featured_blog_posts');
    
    if (error) {
      console.error('Erreur lors de la récupération des articles en vedette:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des articles en vedette:', error);
    return [];
  }
};

// Récupérer les articles liés à un article
export const getRelatedBlogPosts = async (postId: string, limit: number = 3): Promise<BlogPost[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_related_blog_posts', { post_id: postId, limit_count: limit });
    
    if (error) {
      console.error('Erreur lors de la récupération des articles liés:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des articles liés:', error);
    return [];
  }
};

// Récupérer toutes les catégories
export const getBlogCategories = async (): Promise<{category: string, count: number}[]> => {
  try {
    const { data, error } = await supabase.rpc('get_blog_categories');
    
    if (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des catégories:', error);
    return [];
  }
};

// Récupérer tous les articles (y compris les brouillons) pour le back-office
export const getAllBlogPostsForAdmin = async (): Promise<BlogPost[]> => {
  try {
    console.log("Fetching blog posts for admin...");
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur lors de la récupération des articles pour l\'admin:', error);
      return [];
    }
    
    console.log("Blog posts data:", data);
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des articles pour l\'admin:', error);
    return [];
  }
};

// Créer un nouvel article
export const createBlogPost = async (blogPost: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>): Promise<BlogPost | null> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{ ...blogPost }])
      .select()
      .single();
    
    if (error) {
      console.error('Erreur lors de la création de l\'article:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception lors de la création de l\'article:', error);
    return null;
  }
};

// Mettre à jour un article
export const updateBlogPost = async (id: string, blogPost: Partial<BlogPost>): Promise<BlogPost | null> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .update({ 
        ...blogPost, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erreur lors de la mise à jour de l\'article:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception lors de la mise à jour de l\'article:', error);
    return null;
  }
};

// Supprimer un article
export const deleteBlogPost = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erreur lors de la suppression de l\'article:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception lors de la suppression de l\'article:', error);
    return false;
  }
};

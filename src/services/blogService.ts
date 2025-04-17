
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
    
    // Requête directe à la table blog_posts pour récupérer TOUS les articles
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur lors de la récupération des articles pour l\'admin:', error);
      throw new Error(`Erreur DB: ${error.message}`);
    }
    
    console.log(`Admin blog posts fetched: ${data?.length || 0} posts`);
    
    if (data && data.length === 0) {
      console.log("Attention: Aucun article trouvé dans la base de données");
    } else if (data) {
      // Log les IDs et titres des articles récupérés pour débogage
      data.forEach(post => {
        console.log(`Post fetched: ID=${post.id}, Title=${post.title}, Image=${post.image_url}`);
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception lors de la récupération des articles pour l\'admin:', error);
    return [];
  }
};

// Créer un nouvel article
export const createBlogPost = async (blogPost: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>): Promise<BlogPost | null> => {
  try {
    console.log("Creating blog post:", blogPost.title);
    console.log("Post data:", JSON.stringify({
      ...blogPost,
      content: blogPost.content?.substring(0, 100) + "..." // Tronquer pour les logs
    }, null, 2));
    
    // Vérifier que le slug est défini et unique
    if (!blogPost.slug) {
      console.error("Erreur: Le slug est requis");
      return null;
    }
    
    // Vérifier si le slug existe déjà
    try {
      const { data: existingPost, error } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', blogPost.slug)
        .single();
      
      if (error && !error.message.includes('No rows found')) {
        console.warn(`Erreur lors de la vérification du slug: ${error.message}`);
      }
      
      if (existingPost) {
        console.warn(`Un article avec le slug '${blogPost.slug}' existe déjà, génération d'un slug unique`);
        blogPost.slug = `${blogPost.slug}-${Date.now()}`;
      }
    } catch (slugError) {
      console.warn(`Exception lors de la vérification du slug: ${slugError}`);
    }
    
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
      
      console.log("Blog post created successfully:", data?.id);
      return data;
    } catch (insertError) {
      console.error('Exception lors de l\'insertion de l\'article:', insertError);
      return null;
    }
  } catch (error) {
    console.error('Exception lors de la création de l\'article:', error);
    return null;
  }
};

// Mettre à jour un article
export const updateBlogPost = async (id: string, blogPost: Partial<BlogPost>): Promise<BlogPost | null> => {
  try {
    console.log("Updating blog post:", id);
    console.log("Update data:", JSON.stringify(blogPost, null, 2));
    
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
    
    console.log("Blog post updated successfully:", id);
    console.log("Updated data:", data);
    return data;
  } catch (error) {
    console.error('Exception lors de la mise à jour de l\'article:', error);
    return null;
  }
};

// Supprimer un article
export const deleteBlogPost = async (id: string): Promise<boolean> => {
  try {
    console.log("Deleting blog post:", id);
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erreur lors de la suppression de l\'article:', error);
      return false;
    }
    
    console.log("Blog post deleted successfully:", id);
    return true;
  } catch (error) {
    console.error('Exception lors de la suppression de l\'article:', error);
    return false;
  }
};

// Ajouter un article de démonstration
export const addDemoBlogPost = async (): Promise<BlogPost | null> => {
  try {
    console.log("Creating demo blog post...");
    
    const demoPost = {
      title: "Réussites, défis et conseils d'entrepreneurs",
      slug: "reussites-defis-et-conseils-entrepreneurs",
      content: "<p>Découvrez les histoires inspirantes d'entrepreneurs qui ont réussi à développer leur entreprise malgré les défis. Ce guide offre des conseils pratiques et des stratégies éprouvées pour la croissance de votre activité.</p><h2>Les clés du succès entrepreneurial</h2><p>L'entrepreneuriat est un parcours rempli de défis et d'opportunités. Les entrepreneurs qui réussissent partagent souvent certaines qualités comme la persévérance, l'adaptabilité et une vision claire.</p><h3>Stratégies financières pour la croissance</h3><p>Une gestion financière saine est essentielle à la croissance de toute entreprise. Cela inclut la planification budgétaire, l'optimisation fiscale et l'accès aux bons outils de financement.</p>",
      excerpt: "Découvrez les histoires inspirantes d'entrepreneurs qui ont réussi à développer leur entreprise malgré les défis.",
      category: "Témoignages",
      is_published: true,
      is_featured: true,
      author_name: "Équipe iTakecare",
      author_role: "Experts en leasing informatique",
      read_time: "9 minutes de lecture",
      meta_title: "Réussites, défis et conseils d'entrepreneurs | iTakecare",
      meta_description: "Découvrez les histoires inspirantes d'entrepreneurs qui ont réussi à développer leur entreprise malgré les défis. Ce guide offre des conseils pratiques et des stratégies éprouvées pour la croissance de votre activité.",
      image_url: "/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png"
    };
    
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([demoPost])
      .select()
      .single();
    
    if (error) {
      console.error('Erreur lors de la création de l\'article de démonstration:', error);
      return null;
    }
    
    console.log("Demo blog post created successfully:", data?.id);
    return data;
  } catch (error) {
    console.error('Exception lors de la création de l\'article de démonstration:', error);
    return null;
  }
};


import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import BlogHero from "@/components/blog/BlogHero";
import BlogPostContent from "@/components/blog/BlogPostContent";
import RelatedPosts from "@/components/blog/RelatedPosts";
import Newsletter from "@/components/blog/Newsletter";
import { 
  getBlogPostBySlug, 
  getRelatedBlogPosts,
  getBlogCategories,
  BlogPost 
} from "@/services/blogService";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState<{category: string, count: number}[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      
      setLoading(true);
      setError(false);
      
      try {
        // Charger les catégories
        const categoriesData = await getBlogCategories();
        setCategories(categoriesData);
        
        // Charger l'article
        const postData = await getBlogPostBySlug(slug);
        
        if (postData) {
          setPost(postData);
          
          // Charger les articles liés
          const relatedData = await getRelatedBlogPosts(postData.id);
          setRelatedPosts(relatedData);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'article:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [slug]);
  
  // Si une erreur est survenue ou que l'article n'existe pas, rediriger vers la page du blog
  if (error && !loading) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px]">
        {/* Hero Section simplifié pour les articles */}
        <BlogHero 
          searchQuery=""
          setSearchQuery={() => {}}
          categories={categories}
          activeCategory={null}
          onCategoryChange={() => {}}
        />
        
        {loading ? (
          <div className="container mx-auto px-4 py-12 text-center">
            <p className="text-xl">Chargement de l'article...</p>
          </div>
        ) : post ? (
          <>
            <BlogPostContent blogPost={post} />
            
            <div className="container mx-auto px-4">
              <Newsletter />
            </div>
            
            <RelatedPosts posts={relatedPosts} />
          </>
        ) : null}
        
        <HomeFooter />
      </div>
    </div>
  );
};

export default BlogPostPage;

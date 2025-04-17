
import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import BlogPostContent from "@/components/blog/BlogPostContent";
import BlogCard from "@/components/blog/BlogCard";
import { Button } from "@/components/ui/button";
import { 
  getBlogPostBySlug, 
  getAllBlogPosts,
  BlogPost 
} from "@/services/blogService";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      
      setLoading(true);
      setError(false);
      
      try {
        // Charger l'article
        const postData = await getBlogPostBySlug(slug);
        
        if (postData) {
          setPost(postData);
          
          // Charger les derniers articles pour la section du bas
          const allPosts = await getAllBlogPosts();
          // Filtrer pour exclure l'article courant et prendre les 3 plus récents
          const filteredPosts = allPosts
            .filter(p => p.id !== postData.id)
            .slice(0, 3);
          
          setRecentPosts(filteredPosts);
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
      
      <div className="pt-16 pb-12">
        {loading ? (
          <div className="container mx-auto px-4 py-12 text-center">
            <p className="text-xl">Chargement de l'article...</p>
          </div>
        ) : post ? (
          <>
            <BlogPostContent blogPost={post} />
            
            {/* Derniers articles section */}
            <div className="max-w-6xl mx-auto px-4 mt-16">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-[#222222]">
                Découvrez nos derniers articles de blog
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {recentPosts.map(recentPost => (
                  <BlogCard key={recentPost.id} post={recentPost} />
                ))}
              </div>
            </div>
            
            {/* CTA Section */}
            <div className="bg-gradient-to-br from-[#48b5c3] to-[#33638E] text-white mt-20 py-16 px-4 text-center">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Le leasing de matériel informatique <br />
                  n'a plus de <span className="bg-white/20 px-2 py-1 rounded">secrets</span> pour vous
                </h2>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                  <Button 
                    className="bg-white text-[#48b5c3] hover:bg-gray-100"
                    size="lg"
                  >
                    Découvrir le catalogue
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/10"
                    size="lg"
                  >
                    Parler à un conseiller
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
        
        <HomeFooter />
      </div>
    </div>
  );
};

export default BlogPostPage;

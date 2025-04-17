
import React, { useState, useEffect } from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import BlogHero from "@/components/blog/BlogHero";
import FeaturedArticle from "@/components/blog/FeaturedArticle";
import BlogCard from "@/components/blog/BlogCard";
import { Button } from "@/components/ui/button";
import { 
  getAllBlogPosts, 
  getFeaturedBlogPosts,
  getBlogPostsByCategory,
  getBlogCategories,
  BlogPost 
} from "@/services/blogService";

const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [categories, setCategories] = useState<{category: string, count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePosts, setVisiblePosts] = useState(6);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Charger les catégories
      const categoriesData = await getBlogCategories();
      setCategories(categoriesData);
      
      // Charger l'article en vedette
      const featuredData = await getFeaturedBlogPosts();
      if (featuredData.length > 0) {
        setFeaturedPost(featuredData[0]);
      }
      
      // Charger tous les articles
      const postsData = activeCategory 
        ? await getBlogPostsByCategory(activeCategory)
        : await getAllBlogPosts();
      
      setBlogPosts(postsData);
      setLoading(false);
    };
    
    loadData();
  }, [activeCategory]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
    setVisiblePosts(6); // Réinitialiser le nombre d'articles visibles
  };

  const handleLoadMore = () => {
    setVisiblePosts(prev => prev + 6);
  };

  // Filtrer les articles par recherche
  const filteredPosts = searchQuery.trim() 
    ? blogPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : blogPosts;

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px]">
        {/* Hero Section avec titre et recherche */}
        <BlogHero 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
        
        {/* Featured Article Section */}
        {featuredPost && !activeCategory && !searchQuery && (
          <FeaturedArticle post={featuredPost} />
        )}
        
        {/* Latest Articles Section */}
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-8 text-[#222222]">
            {activeCategory ? `Articles - ${activeCategory}` : "Derniers articles"}
            {searchQuery && ` - Résultats pour "${searchQuery}"`}
          </h2>
          
          {loading ? (
            <div className="text-center py-12">Chargement des articles...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 mb-4">
                Aucun article trouvé{searchQuery ? ` pour "${searchQuery}"` : ''}
                {activeCategory ? ` dans la catégorie "${activeCategory}"` : ''}
              </p>
              {(searchQuery || activeCategory) && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory(null);
                  }}
                >
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.slice(0, visiblePosts).map(post => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
              
              {/* Load More Button */}
              {visiblePosts < filteredPosts.length && (
                <div className="text-center mt-12">
                  <Button 
                    variant="outline"
                    className="border-[#48b5c3] text-[#48b5c3] hover:bg-[#48b5c3] hover:text-white rounded-md px-6 py-2"
                    onClick={handleLoadMore}
                  >
                    Voir plus d'articles
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        
        <HomeFooter />
      </div>
    </div>
  );
};

export default BlogPage;

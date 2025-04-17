
import React, { useState, useEffect } from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import BlogHero from "@/components/blog/BlogHero";
import FeaturedArticle from "@/components/blog/FeaturedArticle";
import BlogCard from "@/components/blog/BlogCard";
import { Button } from "@/components/ui/button";

const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sample blog data
  const blogPosts = [
    {
      id: 1,
      title: "Réussites, défis et conseils d'entrepreneurs",
      excerpt: "Découvrez comment le choix du matériel informatique reconditionné peut considérablement réduire l'impact environnemental de votre entreprise tout en optimisant vos coûts.",
      date: "18 mars 2025",
      category: "Catégorie",
      image: "/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png",
      slug: "reussites-defis-et-conseils-entrepreneurs",
      readTime: "9 minutes de lecture"
    },
    {
      id: 2,
      title: "Réussites, défis et conseils d'entrepreneurs",
      excerpt: "Un guide pratique pour sélectionner les MacBook Pro reconditionnés adaptés aux besoins spécifiques de chaque membre de votre équipe.",
      date: "18 mars 2025",
      category: "Catégorie",
      image: "/lovable-uploads/1c9b904d-1c96-4dff-994c-4daaf6fd3ec1.png",
      slug: "guide-choix-macbook-pro-equipe",
      readTime: "9 minutes de lecture"
    },
    {
      id: 3,
      title: "Réussites, défis et conseils d'entrepreneurs",
      excerpt: "Explorez les bénéfices fiscaux souvent méconnus qui font du leasing une solution financièrement avantageuse pour les entreprises de toutes tailles.",
      date: "18 mars 2025",
      category: "Catégorie",
      image: "/lovable-uploads/ad810d22-f182-4048-aae9-fd658e229330.png",
      slug: "avantages-fiscaux-leasing-informatique",
      readTime: "9 minutes de lecture"
    },
    {
      id: 4,
      title: "Réussites, défis et conseils d'entrepreneurs",
      excerpt: "Analyse des nouvelles tendances du travail hybride et comment les entreprises adaptent leur infrastructure informatique pour répondre à ces changements.",
      date: "18 mars 2025",
      category: "Catégorie",
      image: "/lovable-uploads/10277032-6bec-4f1c-a1b5-884fb4f2a2ce.png",
      slug: "tendances-travail-hybride-equipment-it",
      readTime: "9 minutes de lecture"
    },
    {
      id: 5,
      title: "Réussites, défis et conseils d'entrepreneurs",
      excerpt: "Étude de cas détaillée sur la transformation digitale d'une PME belge qui a opté pour du matériel reconditionné haut de gamme.",
      date: "18 mars 2025",
      category: "Catégorie",
      image: "/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png",
      slug: "cas-client-pme-economie-it-reconditionnement",
      readTime: "9 minutes de lecture"
    },
    {
      id: 6,
      title: "Réussites, défis et conseils d'entrepreneurs",
      excerpt: "Conseils pratiques et stratégies d'entretien pour maximiser la longévité et les performances de vos équipements IT professionnels.",
      date: "18 mars 2025",
      category: "Catégorie",
      image: "/lovable-uploads/c8fe2b25-222e-46ff-9a1f-e567d4e08db8.png",
      slug: "meilleures-pratiques-prolonger-duree-vie-parc-informatique",
      readTime: "9 minutes de lecture"
    }
  ];

  const featuredArticle = {
    title: "Réussites, défis et conseils d'entrepreneurs",
    excerpt: "Découvrez comment le choix du matériel informatique reconditionné peut considérablement réduire l'impact environnemental de votre entreprise tout en optimisant vos coûts.",
    image: "/lovable-uploads/4afc9834-aad1-41fe-bd5d-ed594cc03fde.png",
    slug: "reussites-defis-et-conseils-entrepreneurs"
  };

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px]">
        {/* Hero Section avec titre et formulaire d'abonnement */}
        <BlogHero />
        
        {/* Featured Article Section */}
        <FeaturedArticle 
          title={featuredArticle.title}
          excerpt={featuredArticle.excerpt}
          image={featuredArticle.image}
          slug={featuredArticle.slug}
        />
        
        {/* Latest Articles Section */}
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-8 text-[#222222]">Derniers articles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map(post => (
              <BlogCard 
                key={post.id}
                title={post.title}
                excerpt={post.excerpt}
                date={post.date}
                category={post.category}
                image={post.image}
                slug={post.slug}
                readTime={post.readTime}
              />
            ))}
          </div>
          
          {/* Load More Button */}
          <div className="text-center mt-12">
            <Button 
              variant="outline"
              className="border-[#48b5c3] text-[#48b5c3] hover:bg-[#48b5c3] hover:text-white rounded-md px-6 py-2"
            >
              Voir plus d'articles
            </Button>
          </div>
        </div>
        
        <HomeFooter />
      </div>
    </div>
  );
};

export default BlogPage;

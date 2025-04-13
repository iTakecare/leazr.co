
import React, { useState, useEffect } from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import BlogHero from "@/components/blog/BlogHero";
import FeaturedPost from "@/components/blog/FeaturedPost";
import BlogCard from "@/components/blog/BlogCard";
import CategoryFilter from "@/components/blog/CategoryFilter";
import Newsletter from "@/components/blog/Newsletter";

const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sample blog data
  const blogPosts = [
    {
      id: 1,
      title: "Comment le leasing de matériel reconditionné réduit l'empreinte carbone de votre entreprise",
      excerpt: "Découvrez comment le choix du matériel informatique reconditionné peut considérablement réduire l'impact environnemental de votre entreprise tout en optimisant vos coûts.",
      date: "12 avril 2025",
      category: "Développement durable",
      image: "/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png",
      slug: "leasing-materiel-reconditionne-empreinte-carbone"
    },
    {
      id: 2,
      title: "Guide complet: Choisir le bon MacBook Pro pour votre équipe",
      excerpt: "Un guide pratique pour sélectionner les MacBook Pro reconditionnés adaptés aux besoins spécifiques de chaque membre de votre équipe.",
      date: "5 avril 2025",
      category: "Matériel",
      image: "/lovable-uploads/1c9b904d-1c96-4dff-994c-4daaf6fd3ec1.png",
      slug: "guide-choix-macbook-pro-equipe"
    },
    {
      id: 3,
      title: "5 avantages fiscaux du leasing de matériel informatique",
      excerpt: "Explorez les bénéfices fiscaux souvent méconnus qui font du leasing une solution financièrement avantageuse pour les entreprises de toutes tailles.",
      date: "28 mars 2025",
      category: "Finance",
      image: "/lovable-uploads/ad810d22-f182-4048-aae9-fd658e229330.png",
      slug: "avantages-fiscaux-leasing-informatique"
    },
    {
      id: 4,
      title: "Tendances 2025 : L'évolution du travail hybride et ses impacts sur l'équipement IT",
      excerpt: "Analyse des nouvelles tendances du travail hybride et comment les entreprises adaptent leur infrastructure informatique pour répondre à ces changements.",
      date: "20 mars 2025",
      category: "Tendances",
      image: "/lovable-uploads/10277032-6bec-4f1c-a1b5-884fb4f2a2ce.png",
      slug: "tendances-travail-hybride-equipment-it"
    },
    {
      id: 5,
      title: "Cas client : Comment une PME a économisé 30% sur ses coûts IT grâce au reconditionnement",
      excerpt: "Étude de cas détaillée sur la transformation digitale d'une PME belge qui a opté pour du matériel reconditionné haut de gamme.",
      date: "15 mars 2025",
      category: "Témoignages",
      image: "/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png",
      slug: "cas-client-pme-economie-it-reconditionnement"
    },
    {
      id: 6,
      title: "Les meilleures pratiques pour prolonger la durée de vie de votre parc informatique",
      excerpt: "Conseils pratiques et stratégies d'entretien pour maximiser la longévité et les performances de vos équipements IT professionnels.",
      date: "8 mars 2025",
      category: "Maintenance",
      image: "/lovable-uploads/c8fe2b25-222e-46ff-9a1f-e567d4e08db8.png",
      slug: "meilleures-pratiques-prolonger-duree-vie-parc-informatique"
    }
  ];

  const featuredPost = blogPosts[0]; // Use the first post as featured
  const regularPosts = blogPosts.slice(1); // Rest of the posts

  // Extract unique categories
  const categories = Array.from(new Set(blogPosts.map(post => post.category)));

  // Filter posts based on active category and search query
  const filteredPosts = regularPosts.filter(post => {
    const matchesCategory = activeCategory === null || post.category === activeCategory;
    const matchesSearch = searchQuery === "" || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px]">
        <BlogHero />
        
        <div className="container mx-auto px-4 py-10">
          {/* Featured Post */}
          <div className="mb-12">
            <FeaturedPost 
              title={featuredPost.title}
              excerpt={featuredPost.excerpt}
              date={featuredPost.date}
              category={featuredPost.category}
              image={featuredPost.image}
              slug={featuredPost.slug}
            />
          </div>
          
          {/* Category Filter */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Explorer par catégorie</h2>
            <CategoryFilter 
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>
          
          {/* Blog Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredPosts.map(post => (
              <BlogCard 
                key={post.id}
                title={post.title}
                excerpt={post.excerpt}
                date={post.date}
                category={post.category}
                image={post.image}
                slug={post.slug}
              />
            ))}
          </div>
          
          {/* Newsletter Section */}
          <Newsletter />
        </div>
        
        <HomeFooter />
      </div>
    </div>
  );
};

export default BlogPage;

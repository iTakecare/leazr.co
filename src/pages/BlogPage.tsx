
import React, { useState } from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import CtaSection from "@/components/home/CtaSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import BlogCard from "@/components/blog/BlogCard";
import CategoryFilter from "@/components/blog/CategoryFilter";
import FeaturedPost from "@/components/blog/FeaturedPost";
import Newsletter from "@/components/blog/Newsletter";

// Données simulées pour le blog
const blogPosts = [
  {
    id: 1,
    title: "L'impact écologique du numérique : enjeux et solutions",
    excerpt: "Découvrez comment le reconditionnement informatique permet de réduire considérablement l'empreinte carbone des entreprises.",
    date: "18 mars 2023",
    category: "Durabilité",
    image: "/lovable-uploads/aa41f092-7d73-4917-9bb9-78e029f4a786.png",
    slug: "impact-ecologique-numerique-enjeux-solutions"
  },
  {
    id: 2,
    title: "Économiser grâce au matériel reconditionné : une étude de cas",
    excerpt: "Comment une PME a réduit ses coûts informatiques de 40% tout en améliorant la performance de son parc.",
    date: "2 avril 2023",
    category: "Économie",
    image: "/lovable-uploads/dd01c4d2-2532-40c5-b511-60b4cf1d88f6.png",
    slug: "economiser-materiel-reconditionne-etude-cas"
  },
  {
    id: 3,
    title: "Sécurité et confidentialité sur du matériel reconditionné",
    excerpt: "Les garanties et certifications pour assurer la sécurité totale de vos données sur du matériel reconditionné.",
    date: "15 avril 2023",
    category: "Sécurité",
    image: "/lovable-uploads/95b23886-6036-4673-a2d8-fcee08de89b1.png",
    slug: "securite-confidentialite-materiel-reconditionne"
  },
  {
    id: 4,
    title: "Les avantages du leasing informatique pour les startups",
    excerpt: "Flexibilité, gestion de trésorerie et scalabilité : pourquoi le leasing est idéal pour les jeunes entreprises.",
    date: "5 mai 2023",
    category: "Financement",
    image: "/lovable-uploads/3c11e566-72ff-4182-8628-3a147fc708ef.png",
    slug: "avantages-leasing-informatique-startups"
  },
  {
    id: 5,
    title: "Comment choisir la bonne solution de gestion de parc IT",
    excerpt: "Critères essentiels pour sélectionner un outil de gestion de parc informatique adapté à vos besoins.",
    date: "20 mai 2023",
    category: "IT Management",
    image: "/lovable-uploads/8d038f0d-17e4-4f5f-8ead-f7719343506f.png",
    slug: "choisir-solution-gestion-parc-it"
  },
  {
    id: 6,
    title: "Apple vs PC : que choisir pour votre entreprise en 2023 ?",
    excerpt: "Analyse comparative des écosystèmes Apple et Windows pour un usage professionnel moderne.",
    date: "8 juin 2023",
    category: "Technologie",
    image: "/lovable-uploads/1d3ac6e1-5c24-4197-af4f-5aa8f2dd014b.png",
    slug: "apple-vs-pc-choisir-entreprise-2023"
  }
];

const featuredPost = {
  id: 7,
  title: "Le future du travail hybride et ses implications technologiques",
  excerpt: "Comment les organisations peuvent adapter leur infrastructure IT pour répondre aux nouvelles exigences du travail hybride, tout en maintenant productivité et sécurité.",
  date: "12 juin 2023",
  category: "Tendances",
  image: "/lovable-uploads/5677be0b-0218-4a20-be93-ce2a5303184c.png",
  slug: "futur-travail-hybride-implications-technologiques",
  readTime: "8 min"
};

const BlogPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Extraction des catégories uniques
  const categories = Array.from(new Set(blogPosts.map(post => post.category)));
  
  // Filtrage des posts selon la recherche et la catégorie
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === null || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <UnifiedNavigation />
      
      {/* Hero Section avec fond similaire à la page d'accueil */}
      <div className="pt-[100px] relative min-h-[400px] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover"
            alt="Background"
            src="/clip-path-group.png"
          />
          {/* Gradient fade to white overlay */}
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 z-10">
          <div className="max-w-3xl">
            <Badge className="bg-[#48b5c34f] text-[#48b5c3] mb-4 px-3 py-1 text-sm font-medium rounded-full">
              Blog iTakecare
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-[#222222] mb-6">
              Actualités et ressources sur le numérique responsable
            </h1>
            <p className="text-lg text-[#555555] mb-8">
              Découvrez nos articles, guides et études de cas sur le leasing informatique, le reconditionnement et les pratiques durables du numérique.
            </p>
            <div className="relative">
              <Input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-12 rounded-full border-gray-300 pl-5"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Featured Post */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <FeaturedPost 
            title={featuredPost.title}
            excerpt={featuredPost.excerpt}
            date={featuredPost.date}
            category={featuredPost.category}
            image={featuredPost.image}
            slug={featuredPost.slug}
            readTime={featuredPost.readTime}
          />
        </div>
      </section>
      
      {/* Blog Posts Grid */}
      <section className="py-16 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-[#222222]">Nos derniers articles</h2>
            <CategoryFilter 
              categories={categories} 
              activeCategory={activeCategory} 
              onCategoryChange={setActiveCategory} 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
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
          
          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Aucun article ne correspond à votre recherche.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory(null);
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}
          
          <div className="flex justify-center mt-12">
            <Button className="rounded-full px-6 py-3 font-medium bg-[#48b5c3] hover:bg-[#33638E] group">
              Voir plus d'articles
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Newsletter Section */}
      <Newsletter />
      
      {/* CTA Section */}
      <CtaSection />
      
      {/* Footer */}
      <HomeFooter />
    </div>
  );
};

export default BlogPage;

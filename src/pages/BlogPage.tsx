
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Search, 
  Tag, 
  Clock, 
  User, 
  ArrowRight, 
  ChevronRight,
  Recycle,
  Monitor,
  Server,
  Globe
} from "lucide-react";
import HomeFooter from "@/components/home/HomeFooter";
import HeroSection from "@/components/home/HeroSection";

// Types pour les articles de blog
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  category: string;
  tags: string[];
  featured?: boolean;
}

// Données de démonstration pour les articles de blog
const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Comment réduire l'empreinte carbone de votre parc informatique",
    excerpt: "Découvrez les stratégies efficaces pour minimiser l'impact environnemental de vos équipements informatiques.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Marie Dupont",
    date: "2025-04-02",
    readTime: "5 min",
    image: "/lovable-uploads/3adf9af1-b4a0-4b3f-9603-1e04cf6deeb0.png",
    category: "Durabilité",
    tags: ["green IT", "écologie", "empreinte carbone"],
    featured: true
  },
  {
    id: "2",
    title: "Les avantages économiques de la location de matériel informatique",
    excerpt: "Une analyse complète des bénéfices financiers liés à la location plutôt qu'à l'achat de vos équipements IT.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Thomas Lefebvre",
    date: "2025-03-28",
    readTime: "8 min",
    image: "/lovable-uploads/77cb8f7a-a865-497e-812d-e04c6d5c9160.png",
    category: "Finance",
    tags: ["location", "économie", "TCO"]
  },
  {
    id: "3",
    title: "Optimiser la durée de vie de vos ordinateurs portables professionnels",
    excerpt: "Conseils pratiques pour prolonger la durée d'utilisation de vos laptops en entreprise.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Sophie Martin",
    date: "2025-03-20",
    readTime: "6 min",
    image: "/lovable-uploads/8d038f0d-17e4-4f5f-8ead-f7719343506f.png",
    category: "Maintenance",
    tags: ["durabilité", "maintenance", "laptops"]
  },
  {
    id: "4",
    title: "Le cloud computing au service de l'économie circulaire",
    excerpt: "Comment les services cloud contribuent à une approche plus durable de l'informatique d'entreprise.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Jean Durand",
    date: "2025-03-15",
    readTime: "7 min",
    image: "/lovable-uploads/481ee77e-2767-4044-b4dd-801e1b70036a.png",
    category: "Cloud",
    tags: ["cloud", "économie circulaire", "green IT"]
  },
  {
    id: "5",
    title: "Sécurité et conformité dans la gestion de parc informatique",
    excerpt: "Les meilleures pratiques pour assurer la sécurité et la conformité réglementaire de vos équipements.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Claire Petit",
    date: "2025-03-10",
    readTime: "9 min",
    image: "/lovable-uploads/c63a7506-0940-48dc-97a7-5f471d90c628.png",
    category: "Sécurité",
    tags: ["cybersécurité", "conformité", "RGPD"]
  },
  {
    id: "6",
    title: "L'impact du télétravail sur la gestion des équipements IT",
    excerpt: "Analyses et solutions pour une gestion efficace du matériel informatique en contexte de travail hybride.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Paul Dubois",
    date: "2025-03-05",
    readTime: "6 min",
    image: "/lovable-uploads/73d518f9-158d-4e00-bf66-27a3b5132dd7.png",
    category: "Organisation",
    tags: ["télétravail", "mobilité", "gestion de parc"]
  }
];

// Catégories pour le filtrage
const categories = [
  { name: "Tous", icon: null },
  { name: "Durabilité", icon: <Recycle className="h-4 w-4" /> },
  { name: "Équipement", icon: <Monitor className="h-4 w-4" /> },
  { name: "Infrastructure", icon: <Server className="h-4 w-4" /> },
  { name: "Cloud", icon: <Globe className="h-4 w-4" /> }
];

const BlogPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  
  // Format de la date pour l'affichage
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };
  
  // Filtrage des articles
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "Tous" || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Article à la une
  const featuredPost = blogPosts.find(post => post.featured);
  
  // Articles récents (sans l'article à la une)
  const recentPosts = filteredPosts
    .filter(post => !post.featured)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <UnifiedNavigation />
      <div className="pt-[100px]">
        <HeroSection />
        
        <div className="container mx-auto px-4 max-w-[1320px] py-16">
          {/* En-tête du blog */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-[#33638E] mb-4">Blog iTakecare</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Découvrez nos derniers articles, conseils et analyses sur l'IT durable, 
              la gestion de parc informatique et les solutions écologiques pour votre entreprise.
            </p>
          </div>
          
          {/* Barre de recherche */}
          <div className="relative mb-12 max-w-xl mx-auto">
            <div className="flex items-center border-2 border-gray-300 rounded-full px-4 py-2 focus-within:border-[#48b5c3] transition-colors">
              <Search className="h-5 w-5 text-gray-400" />
              <Input 
                type="text"
                placeholder="Rechercher un article..." 
                className="flex-1 border-none shadow-none focus-visible:ring-0 focus-visible:ring-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-gray-400"
                  onClick={() => setSearchTerm("")}
                >
                  Effacer
                </Button>
              )}
            </div>
          </div>
          
          {/* Article en vedette */}
          {featuredPost && !searchTerm && selectedCategory === "Tous" && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold mb-6 text-[#33638E]">À la une</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-8 bg-gray-50 rounded-2xl overflow-hidden shadow-sm">
                <div className="md:col-span-3 h-[300px] md:h-auto">
                  <img 
                    src={featuredPost.image} 
                    alt={featuredPost.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:col-span-2 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-[#48b5c3] mb-2">
                      <span className="bg-[#E5F7F9] px-3 py-1 rounded-full">{featuredPost.category}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{featuredPost.title}</h3>
                    <p className="text-gray-600 mb-4">{featuredPost.excerpt}</p>
                  </div>
                  <div>
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <User className="h-4 w-4 mr-1" />
                      <span className="mr-4">{featuredPost.author}</span>
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="mr-4">{formatDate(featuredPost.date)}</span>
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{featuredPost.readTime}</span>
                    </div>
                    <Button 
                      className="mt-2 bg-[#48b5c3] hover:bg-[#3da6b4] text-white rounded-full"
                      onClick={() => navigate(`/blog/${featuredPost.id}`)}
                    >
                      Lire l'article <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Filtres par catégorie */}
          <div className="mb-10">
            <Tabs defaultValue="Tous" className="w-full">
              <TabsList className="grid w-full max-w-xl mx-auto grid-cols-5 bg-gray-100 rounded-full p-1">
                {categories.map((category) => (
                  <TabsTrigger 
                    key={category.name}
                    value={category.name}
                    className="rounded-full data-[state=active]:bg-[#48b5c3] data-[state=active]:text-white"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <div className="flex items-center gap-1.5">
                      {category.icon}
                      <span>{category.name}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Affichage des articles */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-[#33638E]">
              {searchTerm ? `Résultats pour "${searchTerm}"` : 
              selectedCategory !== "Tous" ? `Articles sur ${selectedCategory}` : 
              "Articles récents"}
            </h2>
            
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-800 mb-2">Aucun article trouvé</h3>
                <p className="text-gray-600">
                  Essayez d'autres termes de recherche ou consultez tous nos articles.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("Tous");
                  }}
                >
                  Voir tous les articles
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post) => (
                  <div 
                    key={post.id} 
                    className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex gap-2 mb-3">
                        <span className="bg-[#E5F7F9] text-[#48b5c3] text-xs px-3 py-1 rounded-full">
                          {post.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-3 line-clamp-2">{post.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="mr-4">{formatDate(post.date)}</span>
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{post.readTime}</span>
                      </div>
                      <Button 
                        variant="link" 
                        className="px-0 text-[#33638E] hover:text-[#48b5c3]"
                        onClick={() => navigate(`/blog/${post.id}`)}
                      >
                        Lire l'article <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Section newsletter */}
          <div className="mt-20 bg-[#E5F7F9] rounded-2xl p-8 md:p-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-[#33638E] mb-4">Restez informé</h2>
              <p className="text-gray-600 mb-8">
                Abonnez-vous à notre newsletter pour recevoir nos derniers articles, conseils et actualités
                sur la gestion durable de votre parc informatique.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input 
                  type="email"
                  placeholder="Votre adresse email" 
                  className="rounded-full border-gray-300 focus-visible:ring-[#48b5c3]"
                />
                <Button className="bg-[#33638E] hover:bg-[#48b5c3] text-white rounded-full whitespace-nowrap">
                  S'abonner
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <HomeFooter />
      </div>
    </div>
  );
};

export default BlogPage;

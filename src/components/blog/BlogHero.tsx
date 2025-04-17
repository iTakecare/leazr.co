
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BlogHeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories?: {category: string, count: number}[];
  activeCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
}

const BlogHero = ({ 
  searchQuery, 
  setSearchQuery, 
  categories = [], 
  activeCategory = null, 
  onCategoryChange = () => {} 
}: BlogHeroProps) => {
  const [email, setEmail] = useState("");
  
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      return;
    }
    // Simuler l'inscription
    alert("Merci pour votre inscription !");
    setEmail("");
  };

  return (
    <div className="w-full bg-white pt-16 pb-12 relative">
      <div className="absolute inset-0 bg-[#f8f8f6] pattern-grid-lg opacity-20"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#222222]">
            Le pouvoir du leasing pour la{" "}
            <span className="bg-[#48b5c3]/20 text-[#33638E] px-4 py-1 rounded-lg">
              réussite des entreprises
            </span>
          </h1>
          
          <p className="text-gray-600 mt-6 mb-8">
            Recevez les derniers articles dans votre boîte mail !
          </p>
          
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Entrez votre email"
              className="flex-grow"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button 
              type="submit"
              className="bg-[#48b5c3] hover:bg-[#3da6b4] whitespace-nowrap"
            >
              S'abonner
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BlogHero;

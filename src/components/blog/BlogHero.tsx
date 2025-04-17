
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
    <div className="flex flex-col min-h-[60vh] items-center gap-6 md:gap-10 py-4 md:py-10 relative">
      {/* Background image avec overlay */}
      <div className="flex flex-col w-full h-[60vh] items-start gap-2.5 absolute top-0 left-0">
        <img
          className="relative w-full h-[60vh] object-cover"
          alt="Background"
          src="/clip-path-group.png"
          width="1920" 
          height="1080"
        />
        <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative w-full max-w-[1320px] mx-auto px-4 py-20 text-center z-10 mt-12">
        <div className="text-center">
          <h1 className="font-black text-[#222222] text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
            Le pouvoir du leasing pour la
          </h1>
          <div className="inline-block text-[#48b5c3] text-4xl sm:text-5xl md:text-6xl font-extrabold mb-8 rounded-lg py-2 px-8" style={{ 
            backgroundColor: 'rgba(72, 181, 195, 0.2)', 
            color: '#48b5c3',
            fontWeight: 900
          }}>
            réussite des entreprises
          </div>
          
          <p className="text-gray-600 mt-6 mb-8 text-xl max-w-2xl mx-auto">
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

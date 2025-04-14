
import React from "react";
import { useParams, Link } from "react-router-dom";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px] pb-20 container mx-auto px-4">
        <Link to="/blog">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au blog
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-6">Article: {slug}</h1>
        <p>Cet article est en cours de développement.</p>
      </div>
      
      <HomeFooter />
    </div>
  );
};

export default BlogPostPage;

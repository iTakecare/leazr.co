
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";

const BlogPage = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px] pb-20 container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Blog</h1>
        <p>Cette page est en cours de développement.</p>
      </div>
      
      <HomeFooter />
    </div>
  );
};

export default BlogPage;

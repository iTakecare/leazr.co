
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface FeaturedPostProps {
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  slug: string;
}

const FeaturedPost = ({ title, excerpt, date, category, image, slug }: FeaturedPostProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-10 bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <div className="md:w-1/2 h-[250px] md:h-auto">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-3">
          <Badge variant="outline" className="bg-[#f8f8f6] text-[#48b5c3] rounded-full">
            {category}
          </Badge>
          <span className="text-sm text-gray-500">{date}</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">{excerpt}</p>
        <Link to={`/blog/${slug}`}>
          <Button variant="ghost" className="group text-[#48b5c3] hover:text-[#33638E] hover:bg-gray-50 p-0">
            Lire l'article complet
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default FeaturedPost;

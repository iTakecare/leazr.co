
import React from "react";
import { Badge } from "@/components/ui/badge";

interface BlogHeroProps {
  title: string;
  category: string;
  date: string;
  author: string;
  authorRole: string;
  image: string;
  readTime?: string;
}

const BlogHero = ({ title, category, date, author, authorRole, image, readTime }: BlogHeroProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="h-[300px] md:h-[400px] relative">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6 md:p-10">
          <Badge className="bg-[#48b5c34f] text-white mb-4 px-3 py-1 text-sm font-medium rounded-full w-fit">
            {category}
          </Badge>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">{title}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div>
                <p className="font-medium">{author}</p>
                <p className="text-sm text-gray-200">{authorRole}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-200">
              <span>{date}</span>
              {readTime && (
                <>
                  <span>•</span>
                  <span>{readTime}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogHero;

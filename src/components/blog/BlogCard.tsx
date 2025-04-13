
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface BlogCardProps {
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  slug: string;
}

const BlogCard = ({ title, excerpt, date, category, image, slug }: BlogCardProps) => {
  return (
    <Link to={`/blog/${slug}`} className="group">
      <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group-hover:shadow-md transition-shadow duration-300">
        <div className="h-[200px] overflow-hidden">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="bg-[#f8f8f6] text-[#48b5c3] rounded-full">
              {category}
            </Badge>
            <span className="text-sm text-gray-500">{date}</span>
          </div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-[#48b5c3] transition-colors">{title}</h3>
          <p className="text-gray-600 text-sm line-clamp-3">{excerpt}</p>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;

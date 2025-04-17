
import React from "react";
import { Link } from "react-router-dom";

interface BlogCardProps {
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  slug: string;
  readTime: string;
}

const BlogCard = ({ title, excerpt, date, category, image, slug, readTime }: BlogCardProps) => {
  // Determine category color based on category name
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "développement durable":
        return "text-purple-600";
      case "matériel":
        return "text-green-600";
      case "finance":
        return "text-yellow-600";
      case "tendances":
        return "text-blue-600";
      case "témoignages":
        return "text-red-600";
      case "maintenance":
        return "text-indigo-600";
      default:
        return "text-[#48b5c3]";
    }
  };

  return (
    <div className="group">
      <Link to={`/blog/${slug}`} className="block">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="h-[220px] overflow-hidden">
            <img 
              src={image} 
              alt={title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="p-5">
            <div className={`text-sm font-medium mb-2 ${getCategoryColor(category)}`}>
              {category}
            </div>
            <h3 className="text-xl font-bold mb-2 text-[#222222] group-hover:text-[#48b5c3] transition-colors">
              {title}
            </h3>
            <div className="flex items-center text-gray-500 text-sm mb-2">
              <span>{date}</span>
              <span className="mx-2">•</span>
              <span>{readTime}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BlogCard;

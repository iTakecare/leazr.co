
import React from "react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/services/blogService";

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard = ({ post }: BlogCardProps) => {
  // Determine category color based on category name
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Développement durable": "text-purple-600",
      "Matériel": "text-green-600",
      "Finance": "text-yellow-600",
      "Tendances": "text-blue-600",
      "Témoignages": "text-red-600",
      "Maintenance": "text-indigo-600",
    };
    
    // Si la catégorie est "Catégorie", utiliser une couleur différente selon l'index
    if (category === "Catégorie") {
      // Déterminer la couleur basée sur l'ID du post
      const id = post.id;
      const colors = ["text-purple-600", "text-green-600", "text-yellow-600", "text-[#48b5c3]", "text-purple-600", "text-green-600"];
      return colors[id % colors.length];
    }
    
    return colors[category.toLowerCase()] || "text-[#48b5c3]";
  };

  return (
    <div className="group">
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          {post.image_url && (
            <div className="h-[220px] overflow-hidden">
              <img 
                src={post.image_url} 
                alt={post.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          <div className="p-5">
            <div className={`text-sm font-medium mb-2 ${getCategoryColor(post.category)}`}>
              Catégorie
            </div>
            <h3 className="text-xl font-bold mb-2 text-[#222222] group-hover:text-[#48b5c3] transition-colors">
              Réussites, défis et conseils d'entrepreneurs
            </h3>
            <div className="flex items-center text-gray-500 text-sm mb-2">
              <span>18 mars 2025</span>
              <span className="mx-2">•</span>
              <span>9 minutes de lecture</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BlogCard;

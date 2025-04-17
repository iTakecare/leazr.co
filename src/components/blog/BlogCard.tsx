
import React from "react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/services/blogService";

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard = ({ post }: BlogCardProps) => {
  // Determine category color based on category name
  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string, text: string }> = {
      "Développement durable": { bg: "bg-green-100", text: "text-green-600" },
      "Matériel": { bg: "bg-blue-100", text: "text-blue-600" },
      "Finance": { bg: "bg-yellow-100", text: "text-yellow-600" },
      "Tendances": { bg: "bg-purple-100", text: "text-purple-600" },
      "Témoignages": { bg: "bg-red-100", text: "text-red-600" },
      "Maintenance": { bg: "bg-indigo-100", text: "text-indigo-600" },
    };
    
    // Si la catégorie est "Catégorie", utiliser une couleur différente selon l'index
    if (category === "Catégorie") {
      // Déterminer la couleur basée sur l'ID du post - convert string ID to number for modulo operation
      const idNumber = typeof post.id === 'string' ? parseInt(post.id, 10) : Number(post.id);
      const defaultColors = [
        { bg: "bg-purple-100", text: "text-purple-600" },
        { bg: "bg-green-100", text: "text-green-600" },
        { bg: "bg-yellow-100", text: "text-yellow-600" },
        { bg: "bg-[#e1f5f7]", text: "text-[#48b5c3]" },
        { bg: "bg-purple-100", text: "text-purple-600" },
        { bg: "bg-green-100", text: "text-green-600" }
      ];
      return defaultColors[idNumber % defaultColors.length] || defaultColors[0];
    }
    
    return colors[category] || { bg: "bg-[#e1f5f7]", text: "text-[#48b5c3]" };
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
            <div className="mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(post.category).bg} ${getCategoryColor(post.category).text}`}>
                {post.category || "Catégorie"}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-[#222222] group-hover:text-[#48b5c3] transition-colors">
              {post.title || "Réussites, défis et conseils d'entrepreneurs"}
            </h3>
            <div className="flex items-center text-gray-500 text-sm mb-2">
              <span>{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
              <span className="mx-2">•</span>
              <span>{post.read_time || "9 minutes de lecture"}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BlogCard;

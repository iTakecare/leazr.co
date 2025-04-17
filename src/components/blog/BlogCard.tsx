
import React from "react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/services/blogService";

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard = ({ post }: BlogCardProps) => {
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
              {post.category}
            </div>
            <h3 className="text-xl font-bold mb-2 text-[#222222] group-hover:text-[#48b5c3] transition-colors">
              {post.title}
            </h3>
            <div className="flex items-center text-gray-500 text-sm mb-2">
              <span>{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
              {post.read_time && (
                <>
                  <span className="mx-2">•</span>
                  <span>{post.read_time}</span>
                </>
              )}
            </div>
            {post.excerpt && (
              <p className="text-gray-600 line-clamp-3">{post.excerpt}</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BlogCard;


import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BlogPost } from "@/services/blogService";

interface FeaturedArticleProps {
  post: BlogPost;
}

const FeaturedArticle = ({ post }: FeaturedArticleProps) => {
  return (
    <div className="w-full py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-16">
          <div className="w-full md:w-1/2">
            {post.image_url ? (
              <img 
                src={post.image_url}
                alt={post.title}
                className="w-full h-auto rounded-lg shadow-md"
              />
            ) : (
              <div className="bg-gray-200 w-full h-72 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Image non disponible</span>
              </div>
            )}
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="font-bold text-[#222222] text-2xl sm:text-3xl md:text-4xl mb-6">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="text-[#222222] text-base md:text-lg mb-6">
                {post.excerpt}
              </p>
            )}
            <Link to={`/blog/${post.slug}`}>
              <Button className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-md font-medium text-white px-6 py-2">
                En savoir plus
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedArticle;

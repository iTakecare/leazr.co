
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
            <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] mb-4">
              Réussites, défis et conseils d'entrepreneurs
            </h2>
            <p className="text-[#222222] text-base mb-4">
              Dès que vous atteignez un certain nombre d'équipements, vous accédez gratuitement à notre logiciel.
            </p>
            <p className="text-[#222222] text-base mb-4">
              Pas d'abonnement, pas de coûts cachés : un outil simple et efficace pour faciliter votre gestion IT.
            </p>
            <p className="text-[#222222] text-base mb-6">
              Vous voulez en savoir plus ?
            </p>
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

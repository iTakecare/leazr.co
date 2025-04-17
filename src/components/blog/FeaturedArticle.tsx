
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface FeaturedArticleProps {
  title: string;
  image: string;
  excerpt: string;
  slug: string;
}

const FeaturedArticle = ({ title, image, excerpt, slug }: FeaturedArticleProps) => {
  return (
    <div className="w-full py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-16">
          <div className="w-full md:w-1/2">
            <img 
              src={image}
              alt={title}
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="font-bold text-[#222222] text-2xl sm:text-3xl md:text-4xl mb-6">
              Réussites, défis et conseils d'entrepreneurs
            </h2>
            <p className="text-[#222222] text-base md:text-lg mb-6">
              Dès que vous atteignez un certain nombre d'équipements, vous accédez gratuitement à notre logiciel.
            </p>
            <p className="text-[#222222] text-base md:text-lg mb-6">
              Pas d'abonnement, pas de coûts cachés : un outil simple et efficace pour faciliter votre gestion IT.
            </p>
            <p className="text-[#222222] text-base md:text-lg mb-8">
              Vous voulez en savoir plus ?
            </p>
            <Link to={`/blog/${slug}`}>
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

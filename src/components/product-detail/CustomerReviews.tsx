
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const CustomerReviews = () => {
  const reviews = [
    {
      id: 1,
      companyName: "Raizume",
      companyType: "PME",
      companySize: "Communication",
      reviewerName: "Corentin Launay",
      reviewerPosition: "Co-Fondateur",
      content: "Nous avons pris nos ordinateurs avec Valaia, et sommes ravis du service ! Je recommande vivement, d'autant que l'équipe est super sympa !",
      avatar: "/placeholder.svg",
    },
    {
      id: 2,
      companyName: "Playground",
      companyType: "50+ employés",
      companySize: "Ingénierie Événementielle",
      reviewerName: "Alexia Montoussin",
      reviewerPosition: "Office Manager",
      content: "Au sein de l'entreprise nous sommes ravis de travailler avec Valaia, plateforme efficace et fiable !",
      avatar: "/placeholder.svg",
    }
  ];
  
  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-4">L'avis de nos clients</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map(review => (
          <div 
            key={review.id} 
            className="bg-white p-6 rounded-xl border shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-4 flex gap-2">
              <Badge variant="outline" className="bg-gray-50">{review.companyType}</Badge>
              <Badge variant="outline" className="bg-gray-50">{review.companySize}</Badge>
            </div>
            
            <h3 className="text-xl font-bold mb-4">
              {review.companyName}
            </h3>
            
            <p className="text-gray-700 mb-6">
              {review.content}
            </p>
            
            <div className="flex items-center">
              <Avatar className="h-12 w-12 mr-4">
                <AvatarImage src={review.avatar} alt={review.reviewerName} />
                <AvatarFallback>{review.reviewerName.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div>
                <h4 className="font-medium">{review.reviewerName}</h4>
                <p className="text-sm text-gray-500">{review.reviewerPosition}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerReviews;

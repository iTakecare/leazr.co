
import React from "react";
import { Star } from "lucide-react";

const CustomerReviews = () => {
  // Mock reviews
  const reviews = [
    {
      id: 1,
      name: "Sophie Martin",
      company: "Agence Créative Digital",
      rating: 5,
      date: "15 mars 2023",
      content: "Excellente expérience de location. Le processus était simple et rapide. L'équipement est exactement ce dont nous avions besoin, et le support client a été très réactif."
    },
    {
      id: 2,
      name: "Thomas Dubois",
      company: "Tech Solutions",
      rating: 4,
      date: "28 avril 2023",
      content: "Très satisfait de notre contrat de location. Le rapport qualité-prix est excellent et la flexibilité des options correspond parfaitement à nos besoins changeants."
    },
    {
      id: 3,
      name: "Marie Lefèvre",
      company: "StartUp Innovante",
      rating: 5,
      date: "10 juin 2023",
      content: "Je recommande vivement ce service. Nous avons pu équiper toute notre équipe rapidement sans impact sur notre trésorerie. Le processus était transparent du début à la fin."
    }
  ];

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold mb-6">Avis clients</h2>
      
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-gray-900">{review.name}</h3>
                <p className="text-sm text-gray-500">{review.company}</p>
              </div>
              <div className="text-sm text-gray-500">
                {review.date}
              </div>
            </div>
            
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                />
              ))}
            </div>
            
            <p className="text-gray-700">{review.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerReviews;

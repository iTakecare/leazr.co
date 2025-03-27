
import React from "react";
import { Star, ThumbsUp, MessageCircle, User } from "lucide-react";

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
    <div className="mb-16 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-8 text-indigo-900 flex items-center">
        <MessageCircle className="h-6 w-6 mr-2 text-indigo-600" />
        Ce que nos clients en disent
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full h-8 w-8 flex items-center justify-center">
              {review.rating}
            </div>
            
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 rounded-full p-2 mr-3">
                <User className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{review.name}</h3>
                <p className="text-sm text-indigo-600">{review.company}</p>
              </div>
            </div>
            
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                />
              ))}
              <span className="text-xs text-gray-500 ml-2">{review.date}</span>
            </div>
            
            <p className="text-gray-700 italic">{review.content}</p>
            
            <div className="mt-4 flex justify-end">
              <button className="flex items-center text-indigo-600 text-sm hover:text-indigo-800 transition-colors">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Utile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerReviews;

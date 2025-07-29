import React from "react";
import { Headphones, ShieldCheck, Truck, RefreshCw } from "lucide-react";

const PackIncludedServices = () => {
  const services = [
    {
      icon: Truck,
      title: "Livraison coordonnée",
      description: "Service de livraison gratuit de tous les équipements de votre pack. Installation coordonnée avec vos équipes si nécessaire.",
      color: "bg-[#33638e]"
    },
    {
      icon: ShieldCheck,
      title: "Garantie pack complète",
      description: "Garantie étendue sur tous les produits du pack pendant toute la durée du contrat, incluant couverture contre les dommages accidentels.",
      color: "bg-[#4ab6c4]"
    },
    {
      icon: Headphones,
      title: "Support technique unifié",
      description: "Un seul interlocuteur pour le support technique de tous vos équipements. Notre équipe basée en Belgique vous accompagne.",
      color: "bg-[#da2959]"
    },
    {
      icon: RefreshCw,
      title: "Renouvellement pack",
      description: "Option de renouvellement complet de votre pack ou de mise à niveau individuelle des équipements en fin de contrat.",
      color: "bg-[#4ab6c4]/70"
    }
  ];

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-8 text-center text-[#33638e]">Services inclus avec votre pack</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service, index) => (
          <div 
            key={index} 
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-md group"
          >
            <div className={`${service.color} h-2 w-full group-hover:h-3 transition-all`}></div>
            <div className="p-6">
              <div className="flex items-start">
                <div className={`rounded-full p-3 mr-4 bg-[#33638e]/5 text-[#33638e]`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#33638e] mb-2 group-hover:text-[#da2959] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PackIncludedServices;
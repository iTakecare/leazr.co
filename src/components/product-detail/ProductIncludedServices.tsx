
import React from "react";
import { Headphones, ShieldCheck, Truck, RefreshCw } from "lucide-react";

const ProductIncludedServices = () => {
  const services = [
    {
      icon: Truck,
      title: "Livraison premium",
      description: "Livraison rapide et gratuite dans toute l'Europe. Nous coordonnons l'installation avec vos équipes.",
      color: "bg-[#33638e]"
    },
    {
      icon: ShieldCheck,
      title: "Garantie complète",
      description: "Garantie étendue pendant toute la durée du contrat, incluant couverture contre les dommages accidentels.",
      color: "bg-[#4ab6c4]"
    },
    {
      icon: Headphones,
      title: "Support dédié",
      description: "Accès prioritaire à notre équipe de support technique qui vous accompagne tout au long de votre contrat.",
      color: "bg-[#da2959]"
    },
    {
      icon: RefreshCw,
      title: "Évolution garantie",
      description: "Option de mise à niveau ou de remplacement de vos équipements à la fin de votre contrat initial.",
      color: "bg-[#4ab6c4]/70"
    }
  ];

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-8 text-center text-[#33638e]">Services inclus dans votre location</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service, index) => (
          <div 
            key={index} 
            className="bg-gradient-to-br from-white to-slate-50 rounded-xl overflow-hidden shadow-md border border-gray-100 transition-all hover:shadow-lg group"
          >
            <div className={`${service.color} h-2 w-full group-hover:h-3 transition-all`}></div>
            <div className="p-6">
              <div className="flex items-start">
                <div className={`rounded-full p-3 mr-4 bg-[#33638e]/10 text-[#33638e]`}>
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

export default ProductIncludedServices;

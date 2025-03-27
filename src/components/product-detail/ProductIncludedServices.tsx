
import React from "react";
import { Headphones, ShieldCheck, Truck, RefreshCw } from "lucide-react";

const ProductIncludedServices = () => {
  const services = [
    {
      icon: Truck,
      title: "Livraison premium",
      description: "Livraison rapide et gratuite dans toute l'Europe. Nous coordonnons l'installation avec vos équipes.",
      color: "bg-blue-500"
    },
    {
      icon: ShieldCheck,
      title: "Garantie complète",
      description: "Garantie étendue pendant toute la durée du contrat, incluant couverture contre les dommages accidentels.",
      color: "bg-green-500"
    },
    {
      icon: Headphones,
      title: "Support dédié",
      description: "Accès prioritaire à notre équipe de support technique qui vous accompagne tout au long de votre contrat.",
      color: "bg-orange-500"
    },
    {
      icon: RefreshCw,
      title: "Évolution garantie",
      description: "Option de mise à niveau ou de remplacement de vos équipements à la fin de votre contrat initial.",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Services inclus dans votre location</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 transition-all hover:shadow-lg group">
            <div className={`${service.color} h-2 w-full group-hover:h-3 transition-all`}></div>
            <div className="p-6">
              <div className="flex items-start">
                <div className={`rounded-lg p-3 mr-4 ${service.color.replace('bg-', 'bg-').replace('500', '100')} 
                  ${service.color.replace('bg-', 'text-')}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
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

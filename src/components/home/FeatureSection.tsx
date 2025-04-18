import React from "react";
import { EuroIcon, TargetIcon, DownloadIcon, HeadphonesIcon, RecycleIcon, DatabaseIcon } from "lucide-react";
import Container from "@/components/layout/Container";
const FeatureSection = () => {
  const features = [{
    id: 1,
    title: "Zéro investissement initial",
    description: "Équipez votre entreprise sans immobiliser votre trésorerie et gardez votre capital pour ce qui compte vraiment.",
    icon: <EuroIcon className="w-8 h-8 md:w-10 md:h-10 text-[#48b5c3]" />,
    bgColor: "bg-[#e6f7fa]"
  }, {
    id: 2,
    title: "Un coût fixe et maîtrisé",
    description: "Dites adieu aux dépenses imprévues : une mensualité fixe couvre tout, y compris la maintenance et le support.",
    icon: <TargetIcon className="w-8 h-8 md:w-10 md:h-10 text-[#48b5c3]" />,
    bgColor: "bg-[#e6f7fa]"
  }, {
    id: 3,
    title: "Un matériel toujours à jour",
    description: "Bénéficiez d'un équipement informatique performant et évolutif grâce à nos mises à niveau régulières.",
    icon: <DownloadIcon className="w-8 h-8 md:w-10 md:h-10 text-[#48b5c3]" />,
    bgColor: "bg-[#e6f7fa]"
  }, {
    id: 4,
    title: "Maintenance et support inclus",
    description: "Ne perdez plus de temps avec des pannes : nous assurons la maintenance et remplaçons votre matériel en cas de problème.",
    icon: <HeadphonesIcon className="w-8 h-8 md:w-10 md:h-10 text-[#48b5c3]" />,
    bgColor: "bg-[#e6f7fa]"
  }, {
    id: 5,
    title: "Alternative économique et durable",
    description: "Profitez de matériel informatique reconditionné haut de gamme à moindre coût, tout en réduisant votre empreinte écologique.",
    icon: <RecycleIcon className="w-8 h-8 md:w-10 md:h-10 text-[#48b5c3]" />,
    bgColor: "bg-[#e6f7fa]"
  }, {
    id: 6,
    title: "Logiciel de gestion de parc IT inclus",
    description: "Pilotez facilement tout votre matériel, suivez vos équipements et gérez vos demandes en un clic grâce à notre plateforme intuitive.",
    icon: <DatabaseIcon className="w-8 h-8 md:w-10 md:h-10 text-[#48b5c3]" />,
    bgColor: "bg-[#e6f7fa]"
  }];
  return <section className="py-16 pt-24 md:pt-32 bg-white">
      <Container maxWidth="custom">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-[32px] md:text-[46px] font-bold text-gray-900 mb-2 md:mb-4 relative">
            Dites adieu au{" "}
            <span className="relative inline-block">
              <span className="absolute inset-0 bg-[#48b5c3]/20 blur-[35px] rounded-lg transform -skew-x-3 w-[120%] h-[150%] -left-[10%] -top-[25%]"></span>
              <span className="relative inline-block bg-[#48b5c3]/20 text-[#48b5c3] px-3 py-1 rounded-md">matériel obsolète</span>
            </span>
          </h2>
          <h2 className="text-[31px] md:text-[46px] font-bold text-gray-900 mb-8">et aux frais imprévus !</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {features.map(feature => <div key={feature.id} className="flex flex-col items-center text-center">
              <div className={`${feature.bgColor} w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-xl md:text-[30px] font-medium text-gray-900 mb-2 md:mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>)}
        </div>
      </Container>
    </section>;
};
export default FeatureSection;
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const HeroSection = (): JSX.Element => {
  // Benefits list
  const benefits = [
    "Du matériel reconditionné haut de gamme, testé et garanti.",
    "Un forfait tout compris : maintenance, support et mises à jour.",
    "Remplacement sous 24h en cas de panne ou sinistre.",
    "Un choix écoresponsable et économique pour votre entreprise.",
  ];

  return (
    <div className="flex flex-col min-h-screen items-center gap-6 md:gap-10 py-4 md:py-10 relative">
      {/* Background image */}
      <div className="flex flex-col w-full h-screen items-start gap-2.5 absolute top-0 left-0">
        <img
          className="relative w-full h-screen object-cover"
          alt="Background"
          src="/clip-path-group.png"
        />
        {/* Gradient fade to white overlay */}
        <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Hero content */}
      <header className="relative w-full max-w-[1331px] mx-auto z-10 px-5 md:px-[37px]">
        <div className="flex flex-col md:flex-row">
          {/* Left content */}
          <div className="w-full md:w-[723px] mb-8 md:mb-0">
            <h1 className="font-black text-[#222222] text-3xl sm:text-4xl md:text-[50px] leading-tight">
              Leasing de matériel
            </h1>
            <div className="flex flex-wrap items-center group my-1 md:my-2">
              <h1 className="font-black text-[#222222] text-3xl sm:text-4xl md:text-[50px] leading-tight mr-2">
                informatique
              </h1>
              <Badge className="bg-[#48b5c34f] group-hover:bg-[#33638E] rounded-[10px] px-2 py-1 md:px-2.5 md:py-[12px] my-1 md:my-2 inline-flex">
                <span className="font-black text-[#48b5c3] group-hover:text-white text-3xl sm:text-4xl md:text-[50px]">
                  Reconditionné
                </span>
              </Badge>
            </div>
            <h1 className="font-black text-[#222222] text-3xl sm:text-4xl md:text-[50px] leading-tight mb-3 md:mb-6">
              sans contraintes
            </h1>

            <p className="font-normal text-[#222222] text-base md:text-lg mb-3 md:mb-8">
              Optez pour un parc informatique performant et écoresponsable, à
              moindre coût :
            </p>

            <ul className="space-y-2 md:space-y-4 mb-6 md:mb-10">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-base md:text-lg mr-2 mt-0.5">✅</span>
                  <span className="font-normal text-[#222222] text-base md:text-lg">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold text-base md:text-lg w-full sm:w-auto">
                Découvrir le catalogue
              </Button>
              <Button
                variant="outline"
                className="rounded-[50px] font-bold text-base md:text-lg hover:bg-[#48B5C3] hover:text-white w-full sm:w-auto mt-2 sm:mt-0"
              >
                En savoir plus
              </Button>
            </div>
          </div>

          {/* Right content - images (hidden on mobile) */}
          <div className="relative flex-1 hidden md:block">
            <img
              className="absolute w-[520px] h-[335px] top-0 right-0 object-cover"
              alt="Computer"
              src="/computer.png"
            />
            <img
              className="absolute w-[255px] h-[164px] bottom-[-95px] right-[580px] object-contain"
              alt="Arrow"
              src="/arrow.png"
            />
          </div>
        </div>

        {/* Testimonial section (responsive) - Modified for desktop position */}
        <div className="fixed-bottom sm:absolute bottom-[-120px] md:bottom-[-130px] left-0 right-0 sm:left-[37px] flex flex-col sm:flex-row items-center w-full sm:w-auto px-4 sm:px-0 pb-4 sm:pb-0 bg-white sm:bg-transparent">
          <div className="w-[50px] h-[50px] md:w-[68px] md:h-[68px] bg-[url(/65bb183cb2697d670222bf00-customer-img-1.png)] bg-cover bg-[50%_50%] mb-2 sm:mb-0 rounded-full" />
          <div className="ml-0 sm:ml-[15px] max-w-[300px] sm:max-w-[227px] text-center sm:text-left mb-3 sm:mb-0">
            <p className="font-normal text-[#222222] text-sm">
              "Rapide et professionnel. Bien reçu mon MacBook Pro avec lequel
              j'écris ces lignes. Très content du matériel !"
            </p>
          </div>
          <Separator orientation="vertical" className="hidden sm:block mx-[25px] h-[47px]" />
          <Separator orientation="horizontal" className="block sm:hidden w-[50%] my-3" />
          <div className="flex items-center">
            <img
              className="w-[36px] h-[36px] md:w-[57px] md:h-[57px]"
              alt="Star rating"
              src="/png-clipart-yellow-star-illustration-yellow-star-color-star-blue.png"
            />
            <div className="ml-[10px]">
              <p className="font-bold text-[#222222] text-base md:text-lg">4,8/5</p>
              <p className="font-normal text-[#222222] text-sm md:text-base">
                satisfactions clients
              </p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default HeroSection;

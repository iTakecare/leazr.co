import { ShoppingCartIcon } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const HeroSection = (): JSX.Element => {
  // Navigation menu items
  const navItems = [
    { label: "Accueil", href: "#" },
    { label: "Catalogue", href: "#" },
    { label: "Logiciel de gestion", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ];

  // Benefits list
  const benefits = [
    "Du matériel reconditionné haut de gamme, testé et garanti.",
    "Un forfait tout compris : maintenance, support et mises à jour.",
    "Remplacement sous 24h en cas de panne ou sinistre.",
    "Un choix écoresponsable et économique pour votre entreprise.",
  ];

  return (
    <div className="flex flex-col min-h-screen items-center gap-[77px] py-10 relative">
      {/* Background image */}
      <div className="flex flex-col w-full h-screen items-start gap-2.5 absolute top-0 left-0">
        <img
          className="relative w-full h-screen object-cover"
          alt="Background"
          src="/clip-path-group.png"
        />
      </div>

      {/* Navigation bar */}
      <Card className="relative w-full max-w-[1320px] mx-auto h-[82px] bg-[#f8f8f6] rounded-[50px] border-2 border-solid border-[#e1e1e1] flex items-center justify-between px-5">
        <div className="flex items-center">
          <img
            className="w-[201px] h-[41px] object-cover"
            alt="Logo"
            src="/logo.png"
          />

          <nav className="ml-[75px]">
            <ul className="flex space-x-[30px]">
              {navItems.map((item, index) => (
                <li key={index}>
                  <a
                    href={item.href}
                    className="font-normal text-[#222222] text-lg"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <ShoppingCartIcon className="w-6 h-6" />
            <Badge className="absolute -top-1 -right-2 w-5 h-5 bg-[#48b5c3] rounded-[10px] flex items-center justify-center p-0">
              <span className="font-bold text-white text-xs">0</span>
            </Badge>
          </div>

          <Button
            variant="outline"
            className="rounded-[50px] font-bold text-lg"
          >
            Se connecter
          </Button>

          <Button className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[50px] font-bold text-lg">
            Catalogue
          </Button>

          <div className="flex items-center ml-4">
            <img className="w-8 h-8" alt="Langue" src="/langue.png" />
            <img
              className="w-[13px] h-[7px] ml-2"
              alt="Vector"
              src="/vector.svg"
            />
          </div>
        </div>
      </Card>

      {/* Hero content */}
      <header className="relative w-full max-w-[1331px] mx-auto h-[537px] z-10 px-[37px]">
        <div className="flex flex-row">
          {/* Left content */}
          <div className="w-[723px]">
            <h1 className="font-black text-[#222222] text-[50px] leading-tight">
              Leasing de matériel
            </h1>
            <div className="flex items-center">
              <h1 className="font-black text-[#222222] text-[50px] leading-tight">
                informatique
              </h1>
              <Badge className="ml-4 bg-[#48b5c34f] rounded-[15px] px-2.5 py-[4px]">
                <span className="font-black text-[#48b5c3] text-[50px]">
                  Reconditionné
                </span>
              </Badge>
            </div>
            <h1 className="font-black text-[#222222] text-[50px] leading-tight mb-6">
              sans contraintes
            </h1>

            <p className="font-normal text-[#222222] text-lg mb-8">
              Optez pour un parc informatique performant et écoresponsable, à
              moindre coût :
            </p>

            <ul className="space-y-1 mb-10">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-lg mr-2">✅</span>
                  <span className="font-normal text-[#222222] text-lg">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex space-x-4">
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold text-lg">
                Découvrir le catalogue
              </Button>
              <Button
                variant="outline"
                className="rounded-[50px] font-bold text-lg hover:bg-[#48B5C3] hover:text-white"
              >
                En savoir plus
              </Button>
            </div>
          </div>

          {/* Right content - images */}
          <div className="relative flex-1">
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

        {/* Testimonial section */}
        <div className="absolute bottom-[-60px] left-[37px] flex items-center">
          <div className="w-[68px] h-[68px] bg-[url(/65bb183cb2697d670222bf00-customer-img-1.png)] bg-cover bg-[50%_50%]" />
          <div className="ml-[15px] max-w-[227px]">
            <p className="font-normal text-[#222222] text-xs">
              "Rapide et professionnel. Bien reçu mon MacBook Pro avec lequel
              j'écris ces lignes. Très content du matériel !"
            </p>
          </div>
          <Separator orientation="vertical" className="mx-[25px] h-[47px]" />
          <img
            className="w-[57px] h-[57px]"
            alt="Star rating"
            src="/png-clipart-yellow-star-illustration-yellow-star-color-star-blue.png"
          />
          <div className="ml-[10px]">
            <p className="font-bold text-[#222222] text-lg">4,8/5</p>
            <p className="font-normal text-[#222222] text-lg">
              satisfactions clients
            </p>
          </div>
        </div>
      </header>
    </div>
  );
};

export default HeroSection;


import React, { useState } from "react";
import Container from "@/components/layout/Container";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

interface FaqItem {
  question: string;
  answer: string;
}

const FaqSection = () => {
  const faqItems: FaqItem[] = [
    {
      question: "Quelles sont les étapes pour souscrire un contrat ?",
      answer: "Pour souscrire à un contrat iTakecare, c'est très simple : contactez-nous pour un premier échange sur vos besoins, recevez une offre personnalisée, sélectionnez le matériel qui vous convient, signez électroniquement le contrat, puis recevez votre matériel sous 3 à 5 jours ouvrables.",
    },
    {
      question: "Combien de temps dure le contrat ?",
      answer: "Nos contrats standard ont une durée de 36 mois. Cependant, nous proposons également des formules sur 24 ou 48 mois selon vos besoins. À la fin du contrat, vous pouvez renouveler votre équipement, prolonger avec le même matériel à tarif réduit, ou arrêter la collaboration.",
    },
    {
      question: "Es-ce que le matériel est garanti ?",
      answer: "Oui, l'ensemble du matériel est garanti pendant toute la durée du contrat. Cette garantie couvre les dysfonctionnements techniques et les pannes matérielles. En cas de problème, nous intervenons sous 24h et remplaçons le matériel défectueux si nécessaire, sans frais supplémentaires.",
    },
    {
      question: "Qu'est ce qui est compris dans la maintenance iTakecare ?",
      answer: "Notre service de maintenance comprend l'assistance technique à distance, le dépannage sur site si nécessaire, le remplacement du matériel défectueux sous 24h, les mises à jour logicielles et de sécurité, ainsi qu'un bilan annuel de votre parc informatique avec recommandations d'optimisation.",
    },
    {
      question: "Pourquoi travaillez-vous avec un partenaire financier ?",
      answer: "Nous collaborons avec des partenaires financiers pour vous offrir des solutions de financement flexibles et avantageuses. Cela nous permet de vous proposer des mensualités adaptées à votre budget tout en garantissant un service de qualité. Nos partenaires sont spécialisés dans le financement d'équipements informatiques pour les entreprises.",
    },
    {
      question: "Est-ce que je suis propriétaire du matériel ?",
      answer: "Pendant la durée du contrat, vous n'êtes pas propriétaire du matériel mais vous en avez l'usage exclusif. À la fin du contrat, plusieurs options s'offrent à vous : prolonger l'utilisation, renouveler pour du matériel plus récent, ou acheter le matériel à sa valeur résiduelle si vous souhaitez en devenir propriétaire.",
    },
    {
      question: "Existe t'il d'autres frais ?",
      answer: "Non, il n'y a pas de frais cachés. La mensualité que nous vous proposons inclut tout : le matériel, la maintenance, le support technique, les réparations et remplacements éventuels. Seuls les cas de dommages causés par une utilisation inappropriée ou négligente peuvent entraîner des frais supplémentaires.",
    },
    {
      question: "Quand les mensualités sont-elles prélevées ?",
      answer: "Les mensualités sont généralement prélevées au début de chaque mois. Toutefois, nous pouvons adapter le calendrier de prélèvement à vos contraintes de trésorerie. Le premier prélèvement intervient après la livraison et l'installation complète de votre matériel.",
    },
  ];

  return (
    <section className="py-16 bg-transparent relative overflow-hidden">
      <Container maxWidth="custom">
        {/* Effets de flou animés derrière le titre */}
        <div className="absolute top-10 left-0 right-0 mx-auto w-[90%] max-w-4xl h-40 bg-[#48b5c3]/15 blur-[60px] rounded-full animate-[pulse_10s_infinite_alternate]"></div>
        <div className="absolute top-20 left-0 right-0 mx-auto w-[70%] max-w-3xl h-32 bg-[#48b5c3]/10 blur-[70px] rounded-full animate-[pulse_15s_infinite_alternate-reverse]"></div>
        
        <div className="text-center mb-12 relative">
          <h2 className="text-[32px] md:text-[46px] font-bold text-gray-900 mb-2">
            Les questions fréquemment
          </h2>
          <div className="inline-block bg-[#48b5c3]/20 text-[#48b5c3] px-6 py-2 rounded-lg text-[32px] md:text-[46px] font-bold">
            Posées
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-white rounded-xl shadow-sm border-none"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-left font-medium text-base md:text-lg text-gray-900">
                      {item.question}
                    </span>
                    <div className="flex-shrink-0 ml-4">
                      {/* The icons will be handled by the AccordionTrigger component's state */}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 pt-0 text-gray-600">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
};

export default FaqSection;

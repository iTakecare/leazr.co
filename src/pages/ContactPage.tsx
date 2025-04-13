
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import CtaSection from "@/components/home/CtaSection";
import { Mail, Phone, MapPin, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";

type FormData = {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
};

const ContactPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log("Form submitted:", data);
    // Ici, vous pourriez ajouter la logique pour envoyer l'email
  };

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px]">
        {/* Hero Section avec le même fond que la page d'accueil */}
        <div className="relative min-h-[50vh] flex items-center">
          {/* Background image - même que page d'accueil */}
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover"
              alt="Background"
              src="/clip-path-group.png"
            />
            {/* Gradient fade to white overlay */}
            <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-black text-[#222222] text-3xl sm:text-4xl md:text-5xl leading-tight mb-6">
                Contactez-nous
              </h1>
              <p className="text-[#222222] text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                Notre équipe est à votre disposition pour répondre à toutes vos questions concernant le leasing informatique reconditionné et vous accompagner dans votre démarche.
              </p>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Coordonnées et infos de contact */}
            <div className="bg-gray-50 rounded-3xl p-8 md:p-10">
              <h2 className="text-2xl font-bold text-[#222222] mb-8">Nos coordonnées</h2>
              
              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="bg-[#48b5c3]/20 p-3 rounded-full mr-4">
                    <MapPin className="h-6 w-6 text-[#48b5c3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#222222] mb-1">Adresse</h3>
                    <p className="text-gray-600">
                      12 Rue de l'Innovation<br />
                      1050 Bruxelles<br />
                      Belgique
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-[#48b5c3]/20 p-3 rounded-full mr-4">
                    <Phone className="h-6 w-6 text-[#48b5c3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#222222] mb-1">Téléphone</h3>
                    <p className="text-gray-600">+32 2 123 45 67</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-[#48b5c3]/20 p-3 rounded-full mr-4">
                    <Mail className="h-6 w-6 text-[#48b5c3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#222222] mb-1">Email</h3>
                    <p className="text-gray-600">info@itakecare.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-[#48b5c3]/20 p-3 rounded-full mr-4">
                    <Clock className="h-6 w-6 text-[#48b5c3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#222222] mb-1">Horaires</h3>
                    <p className="text-gray-600">
                      Lundi - Vendredi: 9h00 - 18h00<br />
                      Weekend: Fermé
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-[#48b5c3]/20 p-3 rounded-full mr-4">
                    <Globe className="h-6 w-6 text-[#48b5c3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#222222] mb-1">Zone de service</h3>
                    <p className="text-gray-600">
                      Belgique, Luxembourg, Pays-Bas, France
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Formulaire de contact */}
            <div className="bg-white rounded-3xl shadow-md p-8 md:p-10 border border-gray-100">
              <h2 className="text-2xl font-bold text-[#222222] mb-8">Envoyez-nous un message</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                    <Input
                      {...register("name", { required: "Le nom est requis" })}
                      placeholder="Votre nom"
                      className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <Input
                      {...register("email", { 
                        required: "L'email est requis",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Adresse email invalide"
                        }
                      })}
                      type="email"
                      placeholder="votre@email.com"
                      className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Entreprise</label>
                  <Input
                    {...register("company")}
                    placeholder="Nom de votre entreprise"
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Sujet</label>
                  <Input
                    {...register("subject", { required: "Le sujet est requis" })}
                    placeholder="Sujet de votre message"
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                  {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <Textarea
                    {...register("message", { required: "Le message est requis" })}
                    rows={5}
                    placeholder="Comment pouvons-nous vous aider ?"
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                  {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-[#48b5c3] hover:bg-[#33638E] rounded-full py-3 px-6"
                >
                  Envoyer le message
                </Button>
              </form>
            </div>
          </div>
        </div>
        
        {/* Map section */}
        <div className="w-full py-12 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#222222] mb-8 text-center">Où nous trouver</h2>
            <div className="w-full h-[400px] rounded-3xl overflow-hidden">
              {/* Placeholder for map - in a real application, you would integrate Google Maps or similar */}
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <p className="text-gray-600 text-center">
                  Carte interactive ici<br />
                  (Intégration Google Maps ou similaire)
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Section - réutilisé de la page d'accueil */}
        <CtaSection />
        
        {/* Footer - réutilisé de la page d'accueil */}
        <HomeFooter />
      </div>
    </div>
  );
};

export default ContactPage;

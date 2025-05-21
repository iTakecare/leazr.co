
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";

type FormData = {
  name: string;
  email: string;
  phone: string;
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
        <div className="relative min-h-[30vh] flex items-center">
          {/* Background image - même que page d'accueil */}
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover"
              alt="Background"
              src="/clip-path-group.png"
              width="1920"
              height="1080"
              fetchPriority="high"
            />
            {/* Gradient fade to white overlay */}
            <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-black text-[#222222] text-4xl sm:text-5xl md:text-6xl leading-tight mb-6">
                Contactons-nous
              </h1>
              <p className="text-[#222222] text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                Parlons de votre projet. 
                Envoyez-nous un message et nous vous contacterons sous un jour ouvrable.
              </p>
            </div>
          </div>
        </div>
        
        {/* Contenu principal - Formulaire centré avec effet halo */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto relative">
            {/* Effet de halo flou derrière le formulaire */}
            <div className="absolute inset-0 bg-[#48b5c3]/20 blur-3xl rounded-full transform -translate-y-10 scale-110 opacity-70 z-0"></div>
            
            {/* Formulaire de contact */}
            <div className="bg-white rounded-3xl shadow-md p-8 md:p-10 border border-gray-100 relative z-10">
              <h2 className="text-2xl font-bold text-[#222222] mb-8 text-center">Envoyez-nous un message</h2>
              
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
                  <label className="block text-sm font-medium text-gray-700">Numéro de téléphone</label>
                  <Input
                    {...register("phone", {
                      pattern: {
                        value: /^(\+\d{1,3}[-.●]?)?\(?\d{3}\)?[-.●]?\d{3}[-.●]?\d{4}$/,
                        message: "Numéro de téléphone invalide"
                      }
                    })}
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
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
        
        <div className="mt-20 bg-[#48b5c3] text-white py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">Besoin d'aide supplémentaire?</h2>
            <div className="text-center">
              <Button
                variant="outline"
                className="bg-white text-[#48b5c3] hover:bg-gray-100 border-none"
              >
                Voir notre FAQ
              </Button>
            </div>
          </div>
        </div>
        
        <footer className="bg-gray-800 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Notre entreprise</h3>
                <p className="text-gray-300 mb-4">
                  Solutions informatiques professionnelles pour entreprises et particuliers.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Contact</h3>
                <p className="text-gray-300">contact@example.com</p>
                <p className="text-gray-300">+33 1 23 45 67 89</p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Liens rapides</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="/login" className="hover:text-white">Connexion</a></li>
                  <li><a href="/solutions" className="hover:text-white">Solutions</a></li>
                  <li><a href="/services" className="hover:text-white">Services</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
              <p>© {new Date().getFullYear()} Tous droits réservés</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ContactPage;

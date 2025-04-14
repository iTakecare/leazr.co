
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import CtaSection from "@/components/home/CtaSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();

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
                {t("contact.title")}
              </h1>
              <p className="text-[#222222] text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                {t("contact.subtitle")}
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
              <h2 className="text-2xl font-bold text-[#222222] mb-8 text-center">{t("contact.form.title")}</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t("contact.form.name")}</label>
                    <Input
                      {...register("name", { required: t("contact.form.name.error") })}
                      placeholder={t("contact.form.name.placeholder")}
                      className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t("contact.form.email")}</label>
                    <Input
                      {...register("email", { 
                        required: t("contact.form.email.error"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("contact.form.email.invalid")
                        }
                      })}
                      type="email"
                      placeholder={t("contact.form.email.placeholder")}
                      className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t("contact.form.phone")}</label>
                  <Input
                    {...register("phone", {
                      pattern: {
                        value: /^(\+\d{1,3}[-.●]?)?\(?\d{3}\)?[-.●]?\d{3}[-.●]?\d{4}$/,
                        message: t("contact.form.phone.invalid")
                      }
                    })}
                    type="tel"
                    placeholder={t("contact.form.phone.placeholder")}
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t("contact.form.company")}</label>
                  <Input
                    {...register("company")}
                    placeholder={t("contact.form.company.placeholder")}
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t("contact.form.subject")}</label>
                  <Input
                    {...register("subject", { required: t("contact.form.subject.error") })}
                    placeholder={t("contact.form.subject.placeholder")}
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                  {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t("contact.form.message")}</label>
                  <Textarea
                    {...register("message", { required: t("contact.form.message.error") })}
                    rows={5}
                    placeholder={t("contact.form.message.placeholder")}
                    className="w-full rounded-lg border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
                  />
                  {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-[#48b5c3] hover:bg-[#33638E] rounded-full py-3 px-6"
                >
                  {t("contact.form.submit")}
                </Button>
              </form>
            </div>
          </div>
        </div>
        
        <CtaSection />
        <HomeFooter />
      </div>
    </div>
  );
};

export default ContactPage;

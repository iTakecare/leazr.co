
import React, { useEffect, useState } from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HeroSection from "@/components/home/HeroSection";
import PartnersSection from "@/components/home/PartnersSection";
import FeatureSection from "@/components/home/FeatureSection";
import PressSection from "@/components/home/PressSection";
import StepsSection from "@/components/home/StepsSection";
import AdvisorSection from "@/components/home/AdvisorSection";
import FaqSection from "@/components/home/FaqSection";
import CtaSection from "@/components/home/CtaSection";
import HomeFooter from "@/components/home/HomeFooter";
import { getPageBySlug } from "@/services/pageService";

const Index = () => {
  const [pageData, setPageData] = useState({
    title: "",
    meta_title: "",
    meta_description: "",
    content: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPageContent = async () => {
      setLoading(true);
      const data = await getPageBySlug('home');
      if (data) {
        setPageData({
          title: data.title,
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          content: data.content || ""
        });
        
        // Mettre à jour les métadonnées de la page
        document.title = data.meta_title || "iTakecare";
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', data.meta_description || "");
        } else {
          const meta = document.createElement('meta');
          meta.name = "description";
          meta.content = data.meta_description || "";
          document.head.appendChild(meta);
        }
      }
      setLoading(false);
    };

    loadPageContent();
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <UnifiedNavigation />
      <div className="pt-[100px]">
        <HeroSection />
        <PartnersSection />
        <FeatureSection />
        <PressSection />
        <StepsSection />
        <AdvisorSection />
        <FaqSection />
        <CtaSection />
        <HomeFooter />
      </div>
    </div>
  );
};

export default Index;

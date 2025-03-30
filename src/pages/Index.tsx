
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, PackageCheck, CreditCard, Shield, Leaf } from "lucide-react";
import Container from "@/components/layout/Container";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const { user, isPartner, isAdmin, isAmbassador, userRoleChecked } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user && userRoleChecked) {
      if (isAdmin()) {
        navigate("/dashboard");
      } else if (isPartner()) {
        navigate("/partner/dashboard");
      } else if (isAmbassador()) {
        navigate("/ambassador/dashboard");
      } else {
        navigate("/client/dashboard");
      }
    }
  }, [user, navigate, isPartner, isAdmin, isAmbassador, userRoleChecked]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
      <Container className="flex-1 flex flex-col">
        <div className="py-12 md:py-20 lg:py-28 relative overflow-hidden">
          {/* Background image with improved gradient */}
          <div className="absolute top-0 right-0 h-full w-1/2 lg:w-2/5 hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-blue-50/80 to-blue-50 dark:via-blue-950/80 dark:to-blue-950 z-10"></div>
            <img 
              src="/lovable-uploads/e3c85b46-0f2e-4316-9fe1-647586b28021.png" 
              alt="Groupe de personnes heureuses utilisant des produits Apple" 
              className="h-full w-full object-cover object-center opacity-70"
            />
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto px-4 md:px-0 relative z-20"
          >
            <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 md:mb-8 shadow-sm">
              Innovation durable pour entreprises modernes
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6 md:mb-8 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Équipement premium 
              <span className="block mt-2">pour équipes performantes</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl">
              Donnez à vos collaborateurs les outils dont ils ont besoin avec notre sélection de matériel Apple et PC haute qualité, sans compromettre votre budget ni l'environnement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
              <Button 
                onClick={() => navigate("/catalogue")}
                className="w-full sm:w-auto justify-center modern-button text-base py-6 px-8"
                size={isMobile ? "lg" : "default"}
              >
                Explorer notre catalogue
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto justify-center bg-white/80 backdrop-blur-sm border-secondary shadow-sm hover:shadow-md text-base py-6 px-8"
                size={isMobile ? "lg" : "default"}
                onClick={() => navigate("/login")}
              >
                Se connecter
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 px-4 md:px-0 md:py-16 mb-12"
        >
          <div className="rounded-xl p-6 md:p-8 glass hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center mb-5 shadow-md">
              <PackageCheck className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Qualité certifiée
            </h3>
            <p className="text-muted-foreground">
              Chaque appareil reconditionné est soumis à des tests rigoureux et bénéficie d'une garantie complète pour une expérience premium.
            </p>
          </div>
          <div className="rounded-xl p-6 md:p-8 glass hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center mb-5 shadow-md">
              <CreditCard className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Formules adaptées
            </h3>
            <p className="text-muted-foreground">
              Des solutions de leasing sur-mesure avec services inclus pour optimiser votre trésorerie et faciliter la gestion de votre parc informatique.
            </p>
          </div>
          <div className="rounded-xl p-6 md:p-8 glass hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center mb-5 shadow-md">
              <Leaf className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Empreinte réduite
            </h3>
            <p className="text-muted-foreground">
              Réduction significative de votre empreinte carbone grâce à l'économie circulaire et des pratiques respectueuses de l'environnement.
            </p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="py-8 px-4 md:px-8 mb-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/30 shadow-md"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Technologie responsable, résultats exceptionnels</h2>
              <p className="text-muted-foreground max-w-lg">Réduisez vos coûts informatiques et votre impact environnemental sans compromettre sur la qualité et les performances de vos équipements.</p>
            </div>
            <Button 
              className="modern-button text-base px-6 py-6 min-w-36"
              onClick={() => navigate("/catalogue")}
            >
              Découvrir nos produits
              <Shield className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default Index;

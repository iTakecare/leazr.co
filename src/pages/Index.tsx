
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
        <div className="py-12 md:py-20 lg:py-28 flex flex-col items-center text-center px-4 md:px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 md:mb-8 shadow-sm">
              Technologie responsable pour entreprises ambitieuses
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6 md:mb-8 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Équipez votre équipe avec 
              <span className="block mt-2">le meilleur du reconditionné</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto">
              Avec iTakecare, louez du matériel informatique premium reconditionné, réduisez vos coûts et votre empreinte écologique tout en maintenant des performances optimales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
              <Button 
                onClick={() => navigate("/catalogue")}
                className="w-full sm:w-auto justify-center modern-button text-base py-6 px-8"
                size={isMobile ? "lg" : "default"}
              >
                Découvrir notre catalogue
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
              Matériel premium
            </h3>
            <p className="text-muted-foreground">
              Des équipements reconditionnés de qualité, testés et certifiés pour garantir une expérience utilisateur optimale.
            </p>
          </div>
          <div className="rounded-xl p-6 md:p-8 glass hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center mb-5 shadow-md">
              <CreditCard className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Leasing flexible
            </h3>
            <p className="text-muted-foreground">
              Des formules de location adaptées à vos besoins avec maintenance incluse et renouvellement sans tracas.
            </p>
          </div>
          <div className="rounded-xl p-6 md:p-8 glass hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center mb-5 shadow-md">
              <Leaf className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Impact écologique réduit
            </h3>
            <p className="text-muted-foreground">
              Jusqu'à 70% d'économies de CO2 par appareil comparé au neuf, pour une démarche RSE concrète.
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
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Technologie durable, performance maximale</h2>
              <p className="text-muted-foreground max-w-lg">Offrez à vos équipes le meilleur matériel reconditionné tout en réduisant votre budget IT et votre empreinte carbone.</p>
            </div>
            <Button 
              className="modern-button text-base px-6 py-6 min-w-36"
              onClick={() => navigate("/catalogue")}
            >
              Voir le catalogue
              <Shield className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default Index;

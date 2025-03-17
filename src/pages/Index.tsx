
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, PackageCheck, CreditCard } from "lucide-react";
import Container from "@/components/layout/Container";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, isPartner, isAdmin, isAmbassador, userRoleChecked } = useAuth();

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
    <div className="min-h-screen flex flex-col">
      <Container className="flex-1 flex flex-col">
        <div className="py-12 md:py-20 lg:py-32 flex flex-col items-center text-center px-4 md:px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
              Leasing informatique éco-responsable
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold leading-tight tracking-tight mb-4 md:mb-6">
              Transformez votre infrastructure IT avec 
              <span className="text-primary"> Hub iTakecare</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-xl mx-auto">
              Créez des offres de leasing pour du matériel informatique reconditionné, calculez vos commissions et gérez vos opportunités en toute simplicité.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center w-full sm:w-auto">
              <Button 
                size="lg" 
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto"
              >
                Commencer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto"
              >
                En savoir plus
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 py-8 md:py-12 lg:py-16 px-4 md:px-0"
        >
          <div className="rounded-xl p-4 md:p-6 glass">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <PackageCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Configurez vos offres
            </h3>
            <p className="text-muted-foreground text-sm md:text-base">
              Sélectionnez des équipements reconditionnés, personnalisez les options et créez des offres de leasing en quelques clics.
            </p>
          </div>
          <div className="rounded-xl p-4 md:p-6 glass">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Calculez votre commission
            </h3>
            <p className="text-muted-foreground text-sm md:text-base">
              Visualisez en temps réel vos commissions et les loyers mensuels pour vos clients.
            </p>
          </div>
          <div className="rounded-xl p-4 md:p-6 glass">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Suivez vos performances
            </h3>
            <p className="text-muted-foreground text-sm md:text-base">
              Analysez vos résultats et optimisez votre approche commerciale grâce à des statistiques détaillées.
            </p>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default Index;

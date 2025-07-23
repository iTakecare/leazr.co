
import React from "react";
import Container from "@/components/layout/Container";
import { motion } from "framer-motion";
import AmbassadorCatalogView from "@/components/ambassador/AmbassadorCatalogView";

const AmbassadorCatalog = () => {
    
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  return (
    <Container>
      <motion.div 
        className="py-6 md:py-8 flex flex-col h-full"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Catalogue Ambassadeur</h2>
        </div>

        <div className="flex-1">
          <AmbassadorCatalogView />
        </div>
      </motion.div>
    </Container>
  );
};

export default AmbassadorCatalog;

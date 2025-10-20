
import React from "react";
import { motion } from "framer-motion";

interface OffersHeaderProps {
  itemVariants?: any; // Make this prop optional
}

const OffersHeader = ({ itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
} }: OffersHeaderProps) => {
  return (
    <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Mes offres
        </h1>
        <p className="text-muted-foreground">
          Gérez et suivez toutes vos offres commerciales
        </p>
      </div>
    </motion.div>
  );
};

export default OffersHeader;

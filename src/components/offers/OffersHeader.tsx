
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface OffersHeaderProps {
  itemVariants: any;
}

const OffersHeader = ({ itemVariants }: OffersHeaderProps) => {
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
      <Button asChild>
        <Link to="/create-offer" className="flex items-center">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle offre
        </Link>
      </Button>
    </motion.div>
  );
};

export default OffersHeader;

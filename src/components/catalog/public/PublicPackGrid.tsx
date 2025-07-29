import React from "react";
import { motion } from "framer-motion";
import { PublicPack } from "@/types/catalog";
import PublicPackCard from "./PublicPackCard";
import { Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PublicPackGridProps {
  packs: PublicPack[];
  companySlug?: string;
}

const PublicPackGrid: React.FC<PublicPackGridProps> = ({ packs, companySlug }) => {
  const navigate = useNavigate();

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handlePackClick = (pack: PublicPack) => {
    if (companySlug) {
      // Navigate to pack details page (when implemented)
      // For now, we could navigate to a pack details route
      if (pack.slug) {
        navigate(`/${companySlug}/pack/${pack.slug}`);
      } else {
        navigate(`/${companySlug}/pack/${pack.id}`);
      }
    }
  };

  // Handle undefined or empty packs array
  if (!packs) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-600">Erreur lors du chargement des packs</p>
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-600">Aucun pack disponible pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
      {packs.map((pack) => (
        <motion.div
          key={pack.id}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
        >
          <PublicPackCard 
            pack={pack} 
            onClick={() => handlePackClick(pack)} 
          />
        </motion.div>
      ))}
    </div>
  );
};

export default PublicPackGrid;
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, AlertCircle } from "lucide-react";
import { useClientData } from "@/hooks/useClientData";
import EquipmentDragDropManager from "@/components/equipment/EquipmentDragDropManager";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ClientEquipmentPage = () => {
  const { clientData, loading, error } = useClientData();

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-2xl w-1/3" />
          <div className="h-4 bg-muted rounded-2xl w-1/2" />
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5 rounded-2xl">
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground mb-2">Aucune information client trouvée</p>
              <p className="text-sm text-muted-foreground">
                Veuillez contacter l'administrateur pour créer votre fiche client.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Gestion des Équipements
            </h1>
            <p className="text-muted-foreground">
              Gérez l'assignation de vos équipements aux collaborateurs
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="bg-muted/30 border-b rounded-t-2xl">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-5 w-5 text-primary" />
              À propos de la gestion des équipements
            </CardTitle>
            <CardDescription className="text-xs">
              Vous pouvez assigner vos équipements contractuels à vos collaborateurs une fois que les numéros de série sont disponibles.
              Les équipements d'offres ne peuvent pas encore être assignés car ils n'ont pas de numéro de série.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <EquipmentDragDropManager
          clientId={clientData.id}
          readOnly={false}
        />
      </motion.div>
    </motion.div>
  );
};

export default ClientEquipmentPage;

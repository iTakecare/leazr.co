
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Laptop, 
  RefreshCw, 
  UserPlus,
  Loader2,
  Users,
  Tags
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getClientIdForUser } from "@/utils/clientUserAssociation";
import { Equipment } from "@/types/equipment";

// Component for displaying client equipment with assignment capabilities
const ClientEquipmentPage = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        if (!user?.id) {
          setLoading(false);
          return;
        }
        
        // Get client ID
        const id = await getClientIdForUser(user.id, user.email || null);
        
        if (id) {
          console.log("Found client ID for equipment:", id);
          setClientId(id);
          
          // For demonstration, using mock equipment data
          // In production, this would be replaced with an API call to fetch actual equipment
          setEquipment([
            {
              id: "EQP-2023-001",
              title: "MacBook Pro 16\"",
              purchasePrice: 2599,
              quantity: 1,
              margin: 0,
              assignedTo: "Jean Dupont",
              role: "Directeur Commercial",
              assignedDate: "15/01/2023",
              status: "Actif",
              serial: "MXJL2LL/A"
            },
            {
              id: "EQP-2023-002",
              title: "iPhone 14 Pro",
              purchasePrice: 1299,
              quantity: 1,
              margin: 0,
              assignedTo: "Marie Lambert",
              role: "Responsable Marketing",
              assignedDate: "22/03/2023",
              status: "Actif",
              serial: "MP9G3LL/A"
            },
            {
              id: "EQP-2023-003",
              title: "Dell XPS 15",
              purchasePrice: 1899,
              quantity: 1,
              margin: 0,
              assignedTo: "Lucas Martin",
              role: "Développeur",
              assignedDate: "10/05/2023",
              status: "En maintenance",
              serial: "XPS159560"
            },
            {
              id: "EQP-2023-004",
              title: "iPad Pro 12.9\"",
              purchasePrice: 1099,
              quantity: 1,
              margin: 0,
              assignedTo: "Sophie Mercier",
              role: "Designer UX",
              assignedDate: "05/06/2023",
              status: "Actif",
              serial: "MP1Y3LL/A"
            },
            {
              id: "EQP-2023-005",
              title: "iPhone 13",
              purchasePrice: 799,
              quantity: 1,
              margin: 0,
              assignedTo: null,
              status: "Non assigné",
              serial: "MLPF3LL/A"
            }
          ] as Equipment[]);
        }
      } catch (error) {
        console.error("Error fetching equipment data:", error);
        toast.error("Erreur lors de la récupération des équipements");
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [user]);

  const handleRefresh = () => {
    setLoading(true);
    // In a real implementation, this would refetch the data
    setTimeout(() => {
      setLoading(false);
      toast.success("Données actualisées");
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    if (status === "Actif") {
      return <Badge className="bg-green-500">Actif</Badge>;
    } else if (status === "En maintenance") {
      return <Badge className="bg-blue-500">En maintenance</Badge>;
    } else if (status === "Non assigné") {
      return <Badge className="bg-yellow-500">Non assigné</Badge>;
    } else {
      return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full p-4 md:p-6"
    >
      <div className="flex justify-between items-center mb-6 bg-muted/30 p-4 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold">Mes Équipements</h1>
          <p className="text-muted-foreground">Gérez vos équipements et attribuez-les à vos collaborateurs</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-primary/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Équipements
            </CardTitle>
            <Laptop className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total des équipements</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-green-500/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Actifs
            </CardTitle>
            <Tags className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.filter(e => e.status === "Actif").length}</div>
            <p className="text-xs text-muted-foreground mt-1">Équipements en service</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-blue-500/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Collaborateurs
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(equipment.filter(e => e.assignedTo).map(e => e.assignedTo)).size}</div>
            <p className="text-xs text-muted-foreground mt-1">Utilisateurs équipés</p>
          </CardContent>
        </Card>
      </div>
      
      <motion.div variants={itemVariants}>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Liste des équipements</CardTitle>
            <CardDescription>
              Gérez tous vos équipements et leurs attributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left font-medium py-2 px-2">ID</th>
                      <th className="text-left font-medium py-2 px-2">Équipement</th>
                      <th className="text-left font-medium py-2 px-2">Numéro de série</th>
                      <th className="text-left font-medium py-2 px-2">Statut</th>
                      <th className="text-left font-medium py-2 px-2">Assigné à</th>
                      <th className="text-left font-medium py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 group">
                        <td className="py-3 px-2 text-sm">{item.id}</td>
                        <td className="py-3 px-2 text-sm font-medium">{item.title}</td>
                        <td className="py-3 px-2 text-sm">{item.serial}</td>
                        <td className="py-3 px-2">
                          {getStatusBadge(item.status as string)}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {item.assignedTo ? (
                            <div>
                              <div>{item.assignedTo}</div>
                              <div className="text-xs text-muted-foreground">{item.role}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Non assigné</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <UserPlus className="h-3 w-3" />
                            <span>{item.assignedTo ? "Réassigner" : "Assigner"}</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ClientEquipmentPage;

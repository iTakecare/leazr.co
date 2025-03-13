import React, { useState, useEffect } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatters";
import { Link } from "react-router-dom";
import {
  Download,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  FileText,
  Check,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getOffers, deleteOffer } from "@/services/offerService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Offer {
  id: string;
  client_name: string;
  amount: number;
  monthly_payment: number;
  commission: number;
  status: string;
  created_at: string;
}

const Offers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const offersData = await getOffers();
      setOffers(offersData);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredOffers = offers.filter((offer) => {
    const matchesSearch = offer.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || offer.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            <Check className="h-3 w-3" />
            <span>Acceptée</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
            <Clock className="h-3 w-3" />
            <span>En attente</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
            <X className="h-3 w-3" />
            <span>Refusée</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
            <Clock className="h-3 w-3" />
            <span>{status || "Inconnu"}</span>
          </div>
        );
    }
  };

  const handleResendOffer = (offerId: string) => {
    toast.success("L'offre a été renvoyée avec succès");
  };

  const handleDownloadPdf = (offerId: string) => {
    toast.success("Le PDF a été téléchargé");
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ?")) {
      const success = await deleteOffer(offerId);
      if (success) {
        toast.success("L'offre a été supprimée avec succès");
        fetchOffers();
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Chargement des offres...</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
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

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Liste des offres</CardTitle>
                    <CardDescription>
                      {filteredOffers.length} offre(s) trouvée(s)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Rechercher..."
                        className="pl-8 w-full sm:w-[200px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs 
                  defaultValue="all" 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                >
                  <TabsList>
                    <TabsTrigger value="all">Toutes</TabsTrigger>
                    <TabsTrigger value="accepted">Acceptées</TabsTrigger>
                    <TabsTrigger value="pending">En attente</TabsTrigger>
                    <TabsTrigger value="rejected">Refusées</TabsTrigger>
                  </TabsList>
                  <TabsContent value={activeTab}>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Loyer mensuel</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOffers.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="h-24 text-center"
                              >
                                <div className="flex flex-col items-center justify-center py-4">
                                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                                  <p className="text-muted-foreground">
                                    Aucune offre trouvée
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredOffers.map((offer) => (
                              <TableRow key={offer.id}>
                                <TableCell className="font-medium">
                                  {offer.client_name}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(offer.amount)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(offer.monthly_payment)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(offer.commission)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(offer.status)}
                                </TableCell>
                                <TableCell>{formatDate(offer.created_at)}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleDownloadPdf(offer.id)}
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Télécharger
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleResendOffer(offer.id)}
                                      >
                                        <Mail className="mr-2 h-4 w-4" />
                                        Renvoyer
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteOffer(offer.id)}
                                        className="text-red-600"
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Montant total des commissions:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(
                      filteredOffers.reduce(
                        (total, offer) => total + offer.commission,
                        0
                      )
                    )}
                  </span>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default Offers;

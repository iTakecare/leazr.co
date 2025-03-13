
import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Offer {
  id: string;
  clientName: string;
  amount: number;
  monthlyPayment: number;
  commission: number;
  status: "accepted" | "pending" | "rejected";
  date: string;
}

const Offers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mock data for offers
  const mockOffers: Offer[] = [
    {
      id: "offer-001",
      clientName: "Société ABC",
      amount: 15750.50,
      monthlyPayment: 499.29,
      commission: 2835.09,
      status: "accepted",
      date: "15/04/2023",
    },
    {
      id: "offer-002",
      clientName: "Cabinet Medical XYZ",
      amount: 8350.00,
      monthlyPayment: 265.53,
      commission: 1503.00,
      status: "pending",
      date: "28/04/2023",
    },
    {
      id: "offer-003",
      clientName: "Restaurant Le Gourmet",
      amount: 4200.00,
      monthlyPayment: 137.76,
      commission: 546.00,
      status: "pending",
      date: "02/05/2023",
    },
    {
      id: "offer-004",
      clientName: "Auto École Drive",
      amount: 3100.00,
      monthlyPayment: 101.68,
      commission: 403.00,
      status: "rejected",
      date: "10/05/2023",
    },
  ];

  const filteredOffers = mockOffers.filter((offer) =>
    offer.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Offer["status"]) => {
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
    }
  };

  const handleResendOffer = (offerId: string) => {
    toast.success("L'offre a été renvoyée avec succès");
  };

  const handleDownloadPdf = (offerId: string) => {
    toast.success("Le PDF a été téléchargé");
  };

  // Animation variants
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
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">Toutes</TabsTrigger>
                    <TabsTrigger value="accepted">Acceptées</TabsTrigger>
                    <TabsTrigger value="pending">En attente</TabsTrigger>
                    <TabsTrigger value="rejected">Refusées</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all">
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
                                  {offer.clientName}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(offer.amount)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(offer.monthlyPayment)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(offer.commission)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(offer.status)}
                                </TableCell>
                                <TableCell>{offer.date}</TableCell>
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
                  <TabsContent value="accepted">
                    {/* Similar table for accepted offers only */}
                    <div className="text-center py-8 text-muted-foreground">
                      Affichage des offres acceptées
                    </div>
                  </TabsContent>
                  <TabsContent value="pending">
                    {/* Similar table for pending offers only */}
                    <div className="text-center py-8 text-muted-foreground">
                      Affichage des offres en attente
                    </div>
                  </TabsContent>
                  <TabsContent value="rejected">
                    {/* Similar table for rejected offers only */}
                    <div className="text-center py-8 text-muted-foreground">
                      Affichage des offres refusées
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

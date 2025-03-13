
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { formatCurrency } from "@/utils/formatters";
import { motion } from "framer-motion";
import { useOffers } from "@/hooks/useOffers";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import refactored components
import OffersHeader from "@/components/offers/OffersHeader";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";

const Offers = () => {
  const {
    filteredOffers,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    fetchOffers,
    handleDeleteOffer,
    handleResendOffer,
    handleDownloadPdf
  } = useOffers();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  // Display loading state
  if (loading) {
    return <OffersLoading />;
  }

  // Display error state if there are no offers
  if (loadingError && filteredOffers.length === 0) {
    return <OffersError errorMessage={loadingError} onRetry={fetchOffers} />;
  }

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <OffersHeader itemVariants={itemVariants} />

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Liste des offres</CardTitle>
                    <CardDescription>
                      {filteredOffers.length} offre(s) trouvée(s)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <OffersSearch 
                      searchTerm={searchTerm} 
                      setSearchTerm={setSearchTerm} 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <OffersFilter 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  filteredOffers={filteredOffers}
                  onDeleteOffer={handleDeleteOffer}
                  onResendOffer={handleResendOffer}
                  onDownloadPdf={handleDownloadPdf}
                />
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

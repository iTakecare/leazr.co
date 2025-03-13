
import React, { useState } from "react";
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

// Import des composants
import OffersHeader from "@/components/offers/OffersHeader";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";
import OfferDetailCard from "@/components/offers/OfferDetailCard";

const Offers = () => {
  const {
    filteredOffers,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    isUpdatingStatus,
    fetchOffers,
    handleDeleteOffer,
    handleResendOffer,
    handleDownloadPdf,
    handleUpdateWorkflowStatus
  } = useOffers();

  const [displayMode, setDisplayMode] = useState<'list' | 'card'>('card');

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
                {displayMode === 'list' ? (
                  <OffersFilter 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    filteredOffers={filteredOffers}
                    onDeleteOffer={handleDeleteOffer}
                    onResendOffer={handleResendOffer}
                    onDownloadPdf={handleDownloadPdf}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex space-x-2">
                        <button
                          className={`px-3 py-1 text-sm rounded-md ${activeTab === 'all' ? 'bg-primary text-white' : 'bg-muted'}`}
                          onClick={() => setActiveTab('all')}
                        >
                          Toutes
                        </button>
                        <button
                          className={`px-3 py-1 text-sm rounded-md ${activeTab === 'accepted' ? 'bg-primary text-white' : 'bg-muted'}`}
                          onClick={() => setActiveTab('accepted')}
                        >
                          Acceptées
                        </button>
                        <button
                          className={`px-3 py-1 text-sm rounded-md ${activeTab === 'pending' ? 'bg-primary text-white' : 'bg-muted'}`}
                          onClick={() => setActiveTab('pending')}
                        >
                          En attente
                        </button>
                        <button
                          className={`px-3 py-1 text-sm rounded-md ${activeTab === 'rejected' ? 'bg-primary text-white' : 'bg-muted'}`}
                          onClick={() => setActiveTab('rejected')}
                        >
                          Refusées
                        </button>
                      </div>
                      <div>
                        <button
                          className={`px-3 py-1 text-sm rounded-md bg-muted`}
                          onClick={() => setDisplayMode(displayMode === 'card' ? 'list' : 'card')}
                        >
                          {displayMode === 'card' ? 'Vue tableau' : 'Vue cartes'}
                        </button>
                      </div>
                    </div>
                    
                    {filteredOffers.map(offer => (
                      <OfferDetailCard 
                        key={offer.id} 
                        offer={offer} 
                        onStatusChange={handleUpdateWorkflowStatus}
                        isUpdatingStatus={isUpdatingStatus}
                      />
                    ))}
                  </div>
                )}
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


import React, { useState } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { formatCurrency } from "@/utils/formatters";
import { motion } from "framer-motion";
import { useContracts } from "@/hooks/useContracts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ContractDetailCard from "@/components/contracts/ContractDetailCard";
import { contractStatuses } from "@/services/contractService";

const Contracts = () => {
  const {
    filteredContracts,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeStatusFilter,
    setActiveStatusFilter,
    isUpdatingStatus,
    fetchContracts,
    handleUpdateContractStatus,
    handleAddTrackingInfo
  } = useContracts();

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

  // Loading state
  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8 flex justify-center items-center">
            <div className="text-center">
              <div className="animate-spin mb-4 h-8 w-8 text-primary mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-muted-foreground">Chargement des contrats...</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Error state
  if (loadingError && filteredContracts.length === 0) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8">
            <div className="text-center">
              <div className="mb-4 text-red-500">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
              <p className="text-muted-foreground mb-4">{loadingError}</p>
              <Button onClick={fetchContracts}>Réessayer</Button>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Empty state
  if (filteredContracts.length === 0) {
    return (
      <PageTransition>
        <Container>
          <motion.div
            className="py-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Aucun contrat trouvé</h2>
                <p className="text-muted-foreground mb-6">
                  Vous n'avez pas encore de contrats actifs.
                </p>
                <p className="text-sm text-muted-foreground">
                  Les contrats seront créés automatiquement lorsque vos offres seront approuvées par le bailleur.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </PageTransition>
    );
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
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-2" />
              <h1 className="text-2xl font-bold">Gestion des contrats</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Gérez vos contrats et suivez leur progression
            </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Liste des contrats</CardTitle>
                    <CardDescription>
                      {filteredContracts.length} contrat(s) trouvé(s)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Rechercher un contrat..."
                        className="pl-8 w-[200px] sm:w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2 mb-4">
                    <button
                      className={`px-3 py-1 text-sm rounded-md ${activeStatusFilter === 'all' ? 'bg-primary text-white' : 'bg-muted'}`}
                      onClick={() => setActiveStatusFilter('all')}
                    >
                      Tous
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded-md ${activeStatusFilter === contractStatuses.CONTRACT_SENT ? 'bg-primary text-white' : 'bg-muted'}`}
                      onClick={() => setActiveStatusFilter(contractStatuses.CONTRACT_SENT)}
                    >
                      Contrats envoyés
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded-md ${activeStatusFilter === contractStatuses.ACTIVE ? 'bg-primary text-white' : 'bg-muted'}`}
                      onClick={() => setActiveStatusFilter(contractStatuses.ACTIVE)}
                    >
                      Actifs
                    </button>
                  </div>
                  
                  {filteredContracts.map(contract => (
                    <ContractDetailCard 
                      key={contract.id} 
                      contract={contract} 
                      onStatusChange={handleUpdateContractStatus}
                      onAddTrackingInfo={handleAddTrackingInfo}
                      isUpdatingStatus={isUpdatingStatus}
                    />
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Valeur mensuelle totale:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(
                      filteredContracts.reduce(
                        (total, contract) => total + contract.monthly_payment,
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

export default Contracts;

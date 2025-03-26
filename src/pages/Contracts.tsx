
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useContracts } from "@/hooks/contracts";
import { motion } from "framer-motion";
import ContractsHeader from "@/components/contracts/ContractsHeader";
import ContractsToolbar from "@/components/contracts/ContractsToolbar";
import ContractsContent from "@/components/contracts/ContractsContent";
import ContractSummary from "@/components/contracts/ContractSummary";
import ContractsEmptyState from "@/components/contracts/ContractsEmptyState";
import ContractsLoading from "@/components/contracts/ContractsLoading";
import ContractsError from "@/components/contracts/ContractsError";

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
    isDeleting,
    deleteInProgress,
    isRefreshing,
    fetchContracts,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    handleDeleteContract,
    viewMode,
    setViewMode,
    includeCompleted,
    setIncludeCompleted
  } = useContracts();

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

  if (loading && !isRefreshing) {
    return (
      <PageTransition>
        <Container>
          <ContractsLoading />
        </Container>
      </PageTransition>
    );
  }

  if (loadingError && filteredContracts.length === 0) {
    return (
      <PageTransition>
        <Container>
          <ContractsError error={loadingError} onRetry={fetchContracts} />
        </Container>
      </PageTransition>
    );
  }

  if (filteredContracts.length === 0 && !isRefreshing && !isDeleting) {
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
              <ContractsEmptyState />
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
            <ContractsHeader 
              isRefreshing={isRefreshing}
              loading={loading}
              isDeleting={isDeleting}
              onRefresh={fetchContracts}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6">
            <ContractsToolbar
              activeStatus={activeStatusFilter}
              onStatusChange={setActiveStatusFilter}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              viewMode={viewMode}
              setViewMode={setViewMode}
              includeCompleted={includeCompleted}
              setIncludeCompleted={setIncludeCompleted}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ContractsContent 
              viewMode={viewMode}
              filteredContracts={filteredContracts}
              loadingError={loadingError}
              isRefreshing={isRefreshing}
              isDeleting={isDeleting}
              isUpdatingStatus={isUpdatingStatus}
              deleteInProgress={deleteInProgress}
              onStatusChange={handleUpdateContractStatus}
              onAddTrackingInfo={handleAddTrackingInfo}
              onDeleteContract={handleDeleteContract}
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <ContractSummary contracts={filteredContracts} />
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default Contracts;

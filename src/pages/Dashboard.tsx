
import React, { useState } from "react";
import { 
  TrendingUp, 
  FileText, 
  Users,
  Package, 
  Percent,
  RefreshCcw,
  Bell,
  Inbox
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/useDashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import { TimeFilterSelector } from "@/components/dashboard/TimeFilterSelector";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import AdminOffersNotifications from "@/components/offers/AdminOffersNotifications";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    stats,
    recentActivity,
    isLoading,
    error,
    timeFilter,
    setTimeFilter,
    refreshData
  } = useDashboard();

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
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="w-full max-w-full p-2 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Bienvenue {user?.first_name || ''} - Vue d'ensemble de vos activités
          </p>
        </div>

        <TimeFilterSelector 
          value={timeFilter} 
          onChange={setTimeFilter} 
          className="w-full sm:w-auto"
        />
      </motion.div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Offres en attente"
            value={stats?.pendingOffers || 0}
            icon={FileText}
            description="Demandes nécessitant une action"
            trend="neutral"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Requêtes clients"
            value={stats?.pendingRequests || 0}
            icon={Inbox}
            description="Demandes clients en attente"
            trend="neutral"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Chiffre d'affaires"
            value={stats?.formattedRevenue || "€0"}
            icon={TrendingUp}
            description={`${timeFilter === 'month' ? 'Ce mois' : timeFilter === 'year' ? 'Cette année' : timeFilter === 'quarter' ? 'Ce trimestre' : 'Total'}`}
            change="+12.5% par rapport à la période précédente"
            trend="up"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Clients"
            value={stats?.clientsCount || 0}
            icon={Users}
            description="Nombre total de clients"
            change="+3 nouveaux ce mois-ci"
            trend="up"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Offres converties"
            value={stats?.acceptedOffers || 0}
            icon={Package}
            description="Offres acceptées et signées"
            trend="neutral"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Marge brute"
            value={stats?.formattedGrossMargin || "€0"}
            icon={Percent}
            description={`${stats?.marginPercentage || 0}% du chiffre d'affaires`}
            trend="neutral"
          />
        </motion.div>

        <motion.div variants={itemVariants} className={isMobile ? "" : "md:col-span-2"}>
          <StatCard
            title="Notifications"
            value="Vous avez des alertes à traiter"
            icon={Bell}
            description="Offres et demandes nécessitant votre attention"
            className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-100 dark:border-purple-900"
          />
        </motion.div>
      </motion.div>
      
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6 mb-8">
        <motion.div variants={itemVariants}>
          <ActivityFeed activities={recentActivity} isLoading={isLoading} />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 md:mt-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full"
        >
          <AdminOffersNotifications />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;

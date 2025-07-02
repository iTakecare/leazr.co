import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface RequestHeroSectionProps {
  offer: any;
  statusInfo: {
    badge: React.ReactNode;
    icon: React.ReactNode;
  };
  formatAmount: (amount: number) => string;
}

export const RequestHeroSection: React.FC<RequestHeroSectionProps> = ({
  offer,
  statusInfo,
  formatAmount
}) => {
  const navigate = useNavigate();

  const getGradientByStatus = (status: string) => {
    switch (status) {
      case 'approved':
        return "from-emerald-500/20 via-green-500/10 to-lime-500/20";
      case 'pending':
        return "from-amber-500/20 via-orange-500/10 to-yellow-500/20";
      case 'rejected':
        return "from-red-500/20 via-rose-500/10 to-pink-500/20";
      case 'sent':
        return "from-blue-500/20 via-indigo-500/10 to-purple-500/20";
      default:
        return "from-slate-500/20 via-gray-500/10 to-neutral-500/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getGradientByStatus(offer.status)} border border-border/50 backdrop-blur-sm`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/client/requests')}
              className="gap-2 hover:bg-background/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux demandes
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Partager
            </Button>
            {offer.status === 'sent' && (
              <Button variant="ghost" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                Voir l'offre
              </Button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              {statusInfo.icon}
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Demande de financement
                </h1>
                <p className="text-muted-foreground mt-1">
                  Référence #{offer.id.slice(0, 8)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50"
              >
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Mensualité demandée
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatAmount(offer.monthly_payment)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50"
              >
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Date de soumission
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {new Date(offer.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50"
              >
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Type de demande
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {offer.type === 'client_request' ? 'Demande client' : 'Offre partenaire'}
                </p>
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-shrink-0"
          >
            {statusInfo.badge}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
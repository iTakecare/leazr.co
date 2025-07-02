import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  FileText, 
  Calendar,
  User,
  Mail,
  Building,
  Download,
  MessageSquare,
  Bell
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOffers } from "@/hooks/useClientOffers";
import { RequestHeroSection } from "@/components/client/RequestHeroSection";
import { RequestStatusTimeline } from "@/components/client/RequestStatusTimeline";

import { DetailedEquipmentSection } from "@/components/client/DetailedEquipmentSection";
import { DocumentUploadSection } from "@/components/client/DocumentUploadSection";
import { ContractSignatureSection } from "@/components/client/ContractSignatureSection";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import { useOfferDocuments } from "@/hooks/useOfferDocuments";

const ClientRequestDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { offers, loading, error } = useClientOffers(user?.email);
  
  const offer = offers.find(o => o.id === id);
  
  // Additional hooks for detailed data
  const { equipment, loading: equipmentLoading } = useOfferEquipment(id);
  const { documents, uploadLinks, loading: documentsLoading } = useOfferDocuments(id);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatEquipmentDescription = (description?: string) => {
    if (!description) return 'Équipement non spécifié';
    
    try {
      const equipmentData = JSON.parse(description);
      if (Array.isArray(equipmentData) && equipmentData.length > 0) {
        return equipmentData.map(item => item.title).filter(Boolean);
      }
    } catch {
      return [description];
    }
    return [description];
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          badge: <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50/80">En attente de validation</Badge>,
          icon: <Clock className="h-6 w-6 text-orange-500" />
        };
      case 'approved':
        return {
          badge: <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Demande approuvée</Badge>,
          icon: <CheckCircle className="h-6 w-6 text-emerald-500" />
        };
      case 'rejected':
        return {
          badge: <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Demande refusée</Badge>,
          icon: <XCircle className="h-6 w-6 text-red-500" />
        };
      case 'sent':
        return {
          badge: <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50/80">Offre transmise</Badge>,
          icon: <AlertCircle className="h-6 w-6 text-blue-500" />
        };
      default:
        return {
          badge: <Badge variant="secondary">{status}</Badge>,
          icon: <Clock className="h-6 w-6 text-muted-foreground" />
        };
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted/50 rounded-2xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-muted/50 rounded-xl"></div>
              <div className="h-48 bg-muted/50 rounded-xl"></div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-muted/50 rounded-xl"></div>
              <div className="h-48 bg-muted/50 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Erreur de chargement</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error || "La demande demandée est introuvable"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const statusInfo = getStatusInfo(offer.status);
  const equipmentList = formatEquipmentDescription(offer.equipment_description);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <RequestHeroSection 
          offer={offer}
          statusInfo={statusInfo}
          formatAmount={formatAmount}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Suivi de votre demande
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RequestStatusTimeline 
                    currentStatus={offer.status}
                    workflowStatus={offer.workflow_status}
                    createdAt={offer.created_at}
                    signedAt={offer.signed_at}
                  />
                </CardContent>
              </Card>
            </motion.div>


            {/* Detailed Equipment Section */}
            {equipment.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <DetailedEquipmentSection 
                  equipment={equipment}
                  loading={equipmentLoading}
                />
              </motion.div>
            )}

            {/* Document Upload Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <DocumentUploadSection 
                documents={documents}
                uploadLinks={uploadLinks}
                loading={documentsLoading}
              />
            </motion.div>

            {/* Contract Signature Section */}
            {(offer.status === 'sent' || offer.signed_at) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <ContractSignatureSection 
                  offer={offer}
                  onViewContract={() => window.open(`/client/offer/${offer.id}`, '_blank')}
                  onSignContract={() => window.open(`/client/offer/${offer.id}/sign`, '_blank')}
                />
              </motion.div>
            )}

          </div>

          {/* Right Column - Information Panel */}
          <div className="space-y-6">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informations contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{offer.client_name}</p>
                      <p className="text-xs text-muted-foreground">Demandeur</p>
                    </div>
                  </div>
                  
                  {offer.client_email && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{offer.client_email}</p>
                        <p className="text-xs text-muted-foreground">Email de contact</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(offer.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">Date de soumission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Technical Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Détails techniques
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Référence</span>
                    <span className="text-sm font-mono">{offer.id.slice(0, 8)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm">
                      {offer.type === 'client_request' ? 'Demande client' : 'Offre partenaire'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Statut workflow</span>
                    <Badge variant="outline" className="text-xs">
                      {offer.workflow_status || 'Initial'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Support */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-muted-foreground/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4" />
                    Besoin d'aide ?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Notre équipe est là pour vous accompagner dans votre demande de financement.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Contacter le support
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ClientRequestDetailPage;
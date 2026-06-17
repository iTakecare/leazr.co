import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  FileText,
  Check,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOffers } from "@/hooks/useClientOffers";

import { DetailedEquipmentSection } from "@/components/client/DetailedEquipmentSection";
import { DocumentUploadSection } from "@/components/client/DocumentUploadSection";
import { ContractSignatureSection } from "@/components/client/ContractSignatureSection";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import { useOfferDocuments } from "@/hooks/useOfferDocuments";
import { mapWorkflowStatusToClientStatus } from "@/utils/statusMapping";
import {
  ClientPage,
  ClientCard,
  StatusBadge,
  clientColors,
  ghostBtnStyle,
} from "@/components/client/clientUi";

const getOfferTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'client_request': 'Demande client',
    'web_request': 'Demande en ligne',
    'partner_request': 'Offre partenaire',
    'ambassador_offer': 'Offre ambassadeur',
    'custom_pack_request': 'Pack personnalisé',
    'purchase_request': "Demande d'achat",
    'self_leasing': 'Auto-financement',
  };
  return labels[type] || type;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente de validation",
  approved: "Demande validée",
  rejected: "Demande refusée",
  sent: "Offre transmise",
};

const STATUS_TONE_FALLBACK: Record<string, { bg: string; fg: string }> = {
  rejected: { bg: "#FEEFEF", fg: "#B91C1C" },
  sent: { bg: "#EAF0FF", fg: "#1D4ED8" },
};

/** 5 étapes du suivi d'une demande (maquette). */
const TRACKER_STEPS = [
  "Demande soumise",
  "En cours d'analyse",
  "Demande validée",
  "Contrat à signer",
  "Matériel commandé",
];

/**
 * Détermine l'index de l'étape "courante" du tracker à partir du statut
 * workflow réel et du statut client mappé. Les étapes < index sont "done".
 */
const resolveTrackerStep = (
  workflowStatus?: string | null,
  mappedStatus?: string,
  signedAt?: string | null,
): number => {
  switch (workflowStatus) {
    case 'equipment_ordered':
    case 'delivered':
    case 'active':
      return 4;
    case 'signed':
    case 'contract_signed':
      return signedAt ? 4 : 3;
    case 'contract_sent':
    case 'financed':
      return 3;
    case 'leaser_approved':
    case 'internal_approved':
      return 2;
    case 'pending':
    case 'draft':
    case 'info_requested':
      return 1;
    default:
      break;
  }
  // Repli sur le statut client mappé
  if (mappedStatus === 'approved') return 2;
  if (mappedStatus === 'rejected') return 1;
  return 1;
};

const ClientRequestDetailPage = () => {
  const { id, slug } = useParams();
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

  if (loading) {
    return (
      <ClientPage maxWidth={1040}>
        <div className="animate-pulse" style={{ display: "grid", gap: 20 }}>
          <div style={{ height: 36, width: 120, background: clientColors.borderSoft, borderRadius: 10 }} />
          <div style={{ height: 140, background: clientColors.borderSoft, borderRadius: 16 }} />
          <div style={{ height: 320, background: clientColors.borderSoft, borderRadius: 16 }} />
        </div>
      </ClientPage>
    );
  }

  if (error || !offer) {
    return (
      <ClientPage maxWidth={1040}>
        <ClientCard pad={20} style={{ borderColor: "#FBD5D5", background: "#FEF6F6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#B91C1C" }}>
            <AlertCircle size={18} />
            <div>
              <p style={{ fontWeight: 600, margin: 0, fontSize: 14 }}>Erreur de chargement</p>
              <p style={{ fontSize: 13, color: clientColors.muted, margin: "4px 0 0" }}>
                {error || "La demande demandée est introuvable"}
              </p>
            </div>
          </div>
        </ClientCard>
      </ClientPage>
    );
  }

  const mappedStatus = mapWorkflowStatusToClientStatus(offer.workflow_status, offer.status);
  const statusLabel = STATUS_LABELS[mappedStatus] || getOfferTypeLabel(mappedStatus);
  const toneFallback = STATUS_TONE_FALLBACK[mappedStatus];
  const equipmentList = formatEquipmentDescription(offer.equipment_description);
  const title = Array.isArray(equipmentList) ? equipmentList[0] : equipmentList;
  const extraCount = Array.isArray(equipmentList) ? equipmentList.length - 1 : 0;
  const ref = offer.dossier_number || offer.id.slice(0, 8).toUpperCase();
  const currentStep = resolveTrackerStep(offer.workflow_status, mappedStatus, offer.signed_at);
  const createdDate = new Date(offer.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <ClientPage maxWidth={1040}>
      {/* Retour */}
      <button
        type="button"
        style={{ ...ghostBtnStyle, marginBottom: 18 }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={15} />
        Retour
      </button>

      {/* Carte en-tête */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ClientCard pad={22} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", margin: 0, color: clientColors.ink }}>
                  {title}
                  {extraCount > 0 && (
                    <span style={{ fontWeight: 600, color: clientColors.muted }}> et {extraCount} autre(s)</span>
                  )}
                </h1>
                <StatusBadge status={mappedStatus} label={statusLabel} tone={toneFallback} />
              </div>
              <div style={{ fontSize: 13, color: clientColors.muted, marginTop: 6 }}>
                {ref} · {getOfferTypeLabel(offer.type)} · Soumise le {createdDate}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: clientColors.faint }}>Mensualité estimée</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: clientColors.indigo }}>
                {formatAmount(offer.monthly_payment)}
                <span style={{ fontSize: 13, fontWeight: 600, color: clientColors.muted }}> / mois</span>
              </div>
            </div>
          </div>
        </ClientCard>
      </motion.div>

      {/* Suivi de la demande — tracker 5 étapes */}
      {mappedStatus !== 'rejected' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <ClientCard pad={22} style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 18px", color: clientColors.ink }}>
              Suivi de la demande
            </h2>
            <div style={{ position: "relative" }}>
              {TRACKER_STEPS.map((label, idx) => {
                const done = idx < currentStep;
                const current = idx === currentStep;
                const isLast = idx === TRACKER_STEPS.length - 1;

                const circleBg = done
                  ? clientColors.emerald
                  : current
                  ? clientColors.indigo
                  : "#EEF0F4";
                const circleColor = done || current ? "#fff" : clientColors.faint;

                return (
                  <div key={label} style={{ display: "flex", gap: 14, position: "relative" }}>
                    {/* Colonne pastille + ligne */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: circleBg,
                          color: circleColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12.5,
                          fontWeight: 700,
                          flexShrink: 0,
                          boxShadow: current ? `0 0 0 4px ${clientColors.indigo}22` : "none",
                          zIndex: 1,
                        }}
                      >
                        {done ? <Check size={15} strokeWidth={3} /> : idx + 1}
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            width: 2,
                            flex: 1,
                            minHeight: 24,
                            background: idx < currentStep ? clientColors.emerald : "#EEF0F4",
                          }}
                        />
                      )}
                    </div>
                    {/* Libellé */}
                    <div style={{ paddingBottom: isLast ? 0 : 18, paddingTop: 4 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: done || current ? 700 : 500,
                          color: done || current ? clientColors.ink : clientColors.faint,
                        }}
                      >
                        {label}
                      </div>
                      {current && (
                        <div style={{ fontSize: 12, color: clientColors.muted, marginTop: 2 }}>
                          Étape en cours
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ClientCard>
        </motion.div>
      )}

      {/* Équipement détaillé */}
      {equipment.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{ marginBottom: 22 }}
        >
          <DetailedEquipmentSection
            equipment={equipment}
            loading={equipmentLoading}
          />
        </motion.div>
      )}

      {/* Documents */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{ marginBottom: 22 }}
      >
        <DocumentUploadSection
          documents={documents}
          uploadLinks={uploadLinks}
          loading={documentsLoading}
        />
      </motion.div>

      {/* Signature contrat */}
      {(offer.status === 'sent' || offer.signed_at) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          style={{ marginBottom: 22 }}
        >
          <ContractSignatureSection
            offer={offer}
            onViewContract={() => window.open(`/client/offer/${offer.id}`, '_blank')}
            onSignContract={() => window.open(`/client/offer/${offer.id}/sign`, '_blank')}
          />
        </motion.div>
      )}

      {/* Support */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <ClientCard pad={20}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MessageSquare size={16} color={clientColors.muted} />
            <span style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink }}>Besoin d'aide ?</span>
          </div>
          <p style={{ fontSize: 12.5, color: clientColors.muted, margin: "0 0 14px" }}>
            Notre équipe est là pour vous accompagner dans votre demande de financement.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const supportRef = offer?.dossier_number || offer?.id?.slice(0, 8) || '';
              const params = new URLSearchParams({
                subject: `Demande d'information - Offre ${supportRef}`,
                category: 'other',
                description: `Bonjour, je voudrais avoir des informations au sujet de mon offre ${supportRef}`,
              });
              navigate(`/${slug}/client/support?${params.toString()}`);
            }}
          >
            <FileText size={15} className="mr-1.5" />
            Contacter le support
          </Button>
        </ClientCard>
      </motion.div>
    </ClientPage>
  );
};

export default ClientRequestDetailPage;

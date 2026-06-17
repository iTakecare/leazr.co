import React from "react";
import { Clock, FileText, AlertCircle, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { motion } from "framer-motion";
import {
  ClientPage,
  ClientPageHeader,
  ClientCard,
  StatusBadge,
  ClientEmptyState,
  clientColors,
  primaryBtnStyle,
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

/** Libellés FR des statuts clients (la teinte est gérée par StatusBadge). */
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
  sent: "Envoyée",
  contract_sent: "Contrat à signer",
  equipment_ordered: "Commande en cours",
  active: "Active",
};

const STATUS_TONE_FALLBACK: Record<string, { bg: string; fg: string }> = {
  rejected: { bg: "#FEEFEF", fg: "#B91C1C" },
  sent: { bg: "#EAF0FF", fg: "#1D4ED8" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32 } },
};

const ClientRequestsPage = () => {
  const { user } = useAuth();
  const { navigateToClient } = useRoleNavigation();
  const { offers, loading, error } = useClientOffers(user?.email);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  /** Nombre d'articles dans la description d'équipement (JSON ou texte). */
  const countEquipment = (description?: string): number => {
    if (!description) return 0;
    try {
      const equipmentData = JSON.parse(description);
      if (Array.isArray(equipmentData)) {
        return equipmentData.filter(
          (item) => item.title || item.product_name || item.name
        ).length || equipmentData.length;
      }
    } catch {
      const lines = description.split('\n').map((l) => l.trim()).filter(Boolean);
      return lines.length;
    }
    return 1;
  };

  const formatEquipmentDescription = (description?: string) => {
    if (!description) return 'Équipement non spécifié';
    try {
      const equipmentData = JSON.parse(description);
      if (Array.isArray(equipmentData) && equipmentData.length > 0) {
        const titles = equipmentData
          .map(item => item.title || item.product_name || item.name)
          .filter(Boolean)
          .filter(t => t !== 'Produit inconnu');
        if (titles.length > 0) {
          return titles.length > 1
            ? `${titles[0]} et ${titles.length - 1} autre(s)`
            : titles[0];
        }
      }
    } catch {
      // Not JSON, check for "Produit inconnu" in plain text
      if (description.includes('Produit inconnu')) {
        // Extract product names from the description lines (format: "Name - Prix: ...")
        const lines = description.split('\n').filter(Boolean);
        const names = lines.map(line => line.split(' - ')[0]?.trim()).filter(Boolean);
        if (names.length > 0) {
          return names.length > 1
            ? `${names[0]} et ${names.length - 1} autre(s)`
            : names[0];
        }
      }
      return description;
    }
    return description;
  };

  const newRequestButton = (
    <button
      type="button"
      style={primaryBtnStyle}
      onClick={() => navigateToClient('catalog')}
    >
      <Plus size={16} />
      Nouvelle demande
    </button>
  );

  if (loading) {
    return (
      <ClientPage maxWidth={1040}>
        <ClientPageHeader
          title="Mes demandes"
          subtitle="Suivez en temps réel l'avancement de vos demandes de leasing."
        />
        <div style={{ display: "grid", gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <ClientCard key={i} pad={18} style={{ height: 88 }}>
              <div className="animate-pulse" style={{ display: "flex", gap: 14, alignItems: "center", height: "100%" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: clientColors.borderSoft }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: "40%", background: clientColors.borderSoft, borderRadius: 6, marginBottom: 10 }} />
                  <div style={{ height: 10, width: "60%", background: clientColors.borderSoft, borderRadius: 6 }} />
                </div>
              </div>
            </ClientCard>
          ))}
        </div>
      </ClientPage>
    );
  }

  if (error) {
    return (
      <ClientPage maxWidth={1040}>
        <ClientPageHeader
          title="Mes demandes"
          subtitle="Suivez en temps réel l'avancement de vos demandes de leasing."
        />
        <ClientCard pad={20} style={{ borderColor: "#FBD5D5", background: "#FEF6F6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#B91C1C" }}>
            <AlertCircle size={18} />
            <p style={{ fontSize: 13, margin: 0 }}>
              Erreur lors du chargement des demandes : {error}
            </p>
          </div>
        </ClientCard>
      </ClientPage>
    );
  }

  return (
    <ClientPage maxWidth={1040}>
      <ClientPageHeader
        title="Mes demandes"
        subtitle="Suivez en temps réel l'avancement de vos demandes de leasing."
        action={newRequestButton}
      />

      {offers.length === 0 ? (
        <ClientEmptyState
          icon={<Clock size={40} color={clientColors.faint} />}
          title="Aucune demande"
          description="Vous n'avez pas encore soumis de demande de financement."
          action={newRequestButton}
        />
      ) : (
        <motion.div
          style={{ display: "grid", gap: 14 }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {offers.map((offer) => {
            const count = countEquipment(offer.equipment_description);
            const ref = offer.dossier_number || offer.id.slice(0, 8).toUpperCase();
            const date = new Date(offer.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const statusLabel = STATUS_LABELS[offer.status] || getOfferTypeLabel(offer.status);
            const toneFallback = STATUS_TONE_FALLBACK[offer.status];

            return (
              <motion.div key={offer.id} variants={itemVariants}>
                <ClientCard
                  pad={16}
                  className="group"
                  style={{ cursor: "pointer", transition: "border-color .15s, box-shadow .15s" }}
                  onClick={() => navigateToClient(`requests/${offer.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C9D2E4";
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(16,24,40,.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = clientColors.border;
                    e.currentTarget.style.boxShadow = "0 1px 2px rgba(16,24,40,.04)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Tuile icône violet pâle */}
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 13,
                        background: "#F2EBFE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {offer.status === 'pending'
                        ? <Clock size={21} color={clientColors.violet} />
                        : <FileText size={21} color={clientColors.violet} />}
                    </div>

                    {/* Titre + statut + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 14.5,
                            fontWeight: 700,
                            color: clientColors.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 360,
                          }}
                        >
                          {formatEquipmentDescription(offer.equipment_description)}
                        </span>
                        <StatusBadge
                          status={offer.status}
                          label={statusLabel}
                          tone={toneFallback}
                        />
                      </div>
                      <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 4 }}>
                        {ref} · {count} article{count > 1 ? "s" : ""} · {date}
                      </div>
                    </div>

                    {/* Mensualité + chevron */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: clientColors.ink, letterSpacing: "-.01em" }}>
                          {formatAmount(offer.monthly_payment)}
                        </div>
                        <div style={{ fontSize: 11, color: clientColors.faint }}>/ mois</div>
                      </div>
                      <ChevronRight size={18} color={clientColors.faint} />
                    </div>
                  </div>
                </ClientCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </ClientPage>
  );
};

export default ClientRequestsPage;

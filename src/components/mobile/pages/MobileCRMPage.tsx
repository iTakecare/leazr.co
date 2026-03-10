import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, FileText, HandHeart, Filter, RefreshCw, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "../MobileLayout";
import { MobileClientCard } from "../cards";
import MobileFilterSheet from "../MobileFilterSheet";
import MobileSearchSheet from "../MobileSearchSheet";
import MobileFAB from "../MobileFAB";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { useCompanyCRM } from "@/hooks/useCompanyDashboard";

// KPI Stats horizontal scroll
const MobileCRMStats: React.FC<{ stats: { totalClients: number; totalOffers: number; totalContracts: number; totalAmbassadors: number } }> = ({ stats }) => {
  const items = [
    { label: "Clients", value: stats.totalClients, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Demandes", value: stats.totalOffers, icon: FileText, color: "bg-secondary text-secondary-foreground" },
    { label: "Contrats", value: stats.totalContracts, icon: HandHeart, color: "bg-primary/20 text-primary" },
    { label: "Ambassadeurs", value: stats.totalAmbassadors, icon: Users, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className={cn("flex-shrink-0 px-4 py-3 rounded-xl min-w-[100px]", item.color)}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 opacity-70" />
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs opacity-80">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
};

// Tab selector
const tabs = [
  { id: "clients", label: "Clients", icon: Users },
  { id: "offers", label: "Demandes", icon: FileText },
  { id: "contracts", label: "Contrats", icon: HandHeart },
  { id: "ambassadors", label: "Ambassadeurs", icon: Users },
];

const MobileCRMPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, offers, contracts, ambassadors, stats, isLoading } = useCompanyCRM();

  const [activeTab, setActiveTab] = useState("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  const pathMatch = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/);
  const companySlug = pathMatch?.[1] || null;
  const basePrefix = companySlug ? `/${companySlug}` : '';

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR');

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Actif", pending: "En attente", inactive: "Inactif",
      completed: "Terminé", cancelled: "Annulé", draft: "Brouillon",
      sent: "Envoyé", signed: "Signé", approved: "Approuvé",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default", pending: "secondary", inactive: "outline",
      completed: "default", cancelled: "destructive", draft: "outline",
      sent: "secondary", signed: "default", approved: "default",
    };
    return variants[status] || "outline";
  };

  const filteredClients = clients.filter(c =>
    !searchTerm ||
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOffers = offers.filter(o =>
    !searchTerm ||
    o.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client_company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContracts = contracts.filter(c =>
    !searchTerm ||
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAmbassadors = ambassadors.filter(a =>
    !searchTerm ||
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderGenericCard = (
    item: { id: string; title: string; subtitle?: string; status?: string; date?: string; value?: string },
    onClick: () => void
  ) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        onClick={onClick}
        className="bg-card border border-border rounded-xl p-4 mb-3 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{item.title}</h3>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
            )}
          </div>
          {item.status && (
            <Badge variant={getStatusVariant(item.status)} className="ml-2 text-[10px] flex-shrink-0">
              {getStatusLabel(item.status)}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between">
          {item.date && <span className="text-xs text-muted-foreground">{item.date}</span>}
          {item.value && <span className="text-xs font-medium text-primary">{item.value}</span>}
        </div>
      </div>
    </motion.div>
  );

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    switch (activeTab) {
      case "clients":
        return filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun client trouvé</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredClients.map(client => (
              <MobileClientCard
                key={client.id}
                client={{
                  id: client.id,
                  name: client.name,
                  company: client.company,
                  email: client.email,
                  phone: client.phone,
                  status: client.status,
                }}
                onClick={() => navigate(`${basePrefix}/admin/clients/${client.id}`)}
                onCall={client.phone ? () => window.open(`tel:${client.phone}`) : undefined}
                onEmail={client.email ? () => window.open(`mailto:${client.email}`) : undefined}
              />
            ))}
          </AnimatePresence>
        );

      case "offers":
        return filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucune demande trouvée</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredOffers.map(offer =>
              renderGenericCard(
                {
                  id: offer.id,
                  title: offer.client_name || "Sans nom",
                  subtitle: offer.equipment_description?.substring(0, 60),
                  status: offer.status,
                  date: formatDate(offer.created_at),
                  value: formatCurrency(offer.amount || 0),
                },
                () => navigate(`${basePrefix}/admin/offers/${offer.id}`)
              )
            )}
          </AnimatePresence>
        );

      case "contracts":
        return filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <HandHeart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun contrat trouvé</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredContracts.map(contract =>
              renderGenericCard(
                {
                  id: contract.id,
                  title: contract.client_name || "Sans nom",
                  subtitle: contract.contract_number || contract.leaser_name,
                  status: contract.status,
                  date: formatDate(contract.created_at),
                  value: formatCurrency(contract.monthly_payment || 0) + "/mois",
                },
                () => navigate(`${basePrefix}/admin/contracts/${contract.id}`)
              )
            )}
          </AnimatePresence>
        );

      case "ambassadors":
        return filteredAmbassadors.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun ambassadeur trouvé</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredAmbassadors.map(ambassador =>
              renderGenericCard(
                {
                  id: ambassador.id,
                  title: ambassador.name,
                  subtitle: `${ambassador.region || "—"} • ${ambassador.clients_count || 0} clients`,
                  status: ambassador.status,
                  date: formatDate(ambassador.created_at),
                },
                () => navigate(`${basePrefix}/admin/ambassadors/${ambassador.id}`)
              )
            )}
          </AnimatePresence>
        );

      default:
        return null;
    }
  };

  return (
    <MobileLayout
      title="CRM"
      showSearch={true}
      onSearchClick={() => setSearchSheetOpen(true)}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">CRM</h1>
            <p className="text-sm text-muted-foreground">Gestion de la relation client</p>
          </div>
        </div>

        {/* KPI Stats */}
        <MobileCRMStats stats={stats} />

        {/* Tab selector */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search inline */}
        {searchTerm && (
          <div className="flex items-center gap-2 px-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Recherche: "{searchTerm}"
            </span>
            <button onClick={() => setSearchTerm("")} className="text-xs text-primary ml-auto">
              Effacer
            </button>
          </div>
        )}

        {/* Content */}
        <div className="pb-4">
          {renderTabContent()}
        </div>
      </div>

      {/* FAB */}
      <MobileFAB
        primaryAction={{
          id: 'create-client',
          icon: Plus,
          label: 'Nouveau client',
          href: `${basePrefix}/admin/clients/edit/new`,
        }}
      />

      {/* Search Sheet */}
      <MobileSearchSheet
        open={searchSheetOpen}
        onClose={() => setSearchSheetOpen(false)}
        onSearch={setSearchTerm}
        placeholder="Rechercher dans le CRM..."
      />
    </MobileLayout>
  );
};

export default MobileCRMPage;

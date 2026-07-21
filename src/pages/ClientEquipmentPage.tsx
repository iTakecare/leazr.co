import React, { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Users, AlertCircle, Search, FileText, Cpu, MapPin, Download, Filter, Laptop, Headset } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientData } from "@/hooks/useClientData";
import EquipmentDragDropManager from "@/components/equipment/EquipmentDragDropManager";
import LocationManager from "@/components/equipment/LocationManager";
import SoftwareDeploymentWizard from "@/components/equipment/SoftwareDeploymentWizard";
import ClientSoftwareTab from "@/components/equipment/ClientSoftwareTab";
import EquipmentAssistanceDialog, { AssistanceEquipment } from "@/components/equipment/EquipmentAssistanceDialog";
import ClientOwnedEquipmentTab from "@/components/equipment/ClientOwnedEquipmentTab";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  clientColors,
  ClientPage,
  ClientPageHeader,
  ClientCard,
  equipChipStyle,
  ClientEmptyState,
} from "@/components/client/clientUi";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* ── Groupe d'onglets pilule segmentée (maquette) ── */
const SEG_TABS = [
  { value: "assign", label: "Assignation", icon: Users },
  { value: "by-contract", label: "Par contrat", icon: FileText },
  { value: "by-equipment", label: "Liste complète", icon: Cpu },
  { value: "locations", label: "Emplacements", icon: MapPin },
  { value: "owned", label: "Hors contrat", icon: Package },
  { value: "software", label: "Logiciels", icon: Download },
] as const;

const SegmentedTabs: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div
    style={{
      display: "inline-flex",
      gap: 2,
      background: "#ECEEF2",
      borderRadius: 13,
      padding: 4,
      marginBottom: 22,
      flexWrap: "wrap",
    }}
  >
    {SEG_TABS.map((t) => {
      const active = value === t.value;
      const Icon = t.icon;
      return (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 34,
            padding: "0 14px",
            border: 0,
            borderRadius: 10,
            background: active ? "#fff" : "transparent",
            boxShadow: active ? "0 1px 3px rgba(16,24,40,.1)" : "none",
            color: active ? clientColors.ink : clientColors.muted,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            transition: "background .15s, color .15s",
          }}
        >
          <Icon style={{ width: 15, height: 15 }} />
          {t.label}
        </button>
      );
    })}
  </div>
);

/* ── Pastille catégorie (mappe les clés internes vers les libellés clientUi) ── */
const CHIP_LABEL: Record<string, string> = {
  informatique: "Informatique",
  telephonie: "Téléphonie",
  ecrans: "Écrans",
  impression: "Accessoires",
  tablettes: "Tablettes",
  autre: "Accessoires",
};

const CategoryChip: React.FC<{ category: string }> = ({ category }) => {
  const label = CHIP_LABEL[category] || "Accessoires";
  return <span style={equipChipStyle(label)}>{label}</span>;
};

const ClientEquipmentPage = ({ defaultTab = "by-contract" }: { defaultTab?: string }) => {
  const { clientData, loading, error } = useClientData();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deployWizardOpen, setDeployWizardOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [assistanceOpen, setAssistanceOpen] = useState(false);
  const [assistanceEquipment, setAssistanceEquipment] = useState<AssistanceEquipment | null>(null);

  const openAssistance = (eq: AssistanceEquipment) => {
    setAssistanceEquipment(eq);
    setAssistanceOpen(true);
  };

  // Fetch real equipment from contract_equipment table
  const { data: contractEquipmentRaw = [] } = useQuery({
    queryKey: ["client-contract-equipment", clientData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_equipment")
        .select(`
          id, title, quantity, serial_number, monthly_payment, purchase_price,
          collaborator_id, contract_id,
          contracts!inner(id, client_name, status, tracking_number, contract_number, monthly_payment, created_at, client_id)
        `)
        .eq("contracts.client_id", clientData!.id)
        .in("contracts.status", ["active", "signed", "delivered"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientData?.id,
  });

  // Group by contract for "Par contrat" tab
  const contractsMap = new Map<string, { id: string; client_name: string; status: string; contract_number: string | null; monthly_payment: number | null; items: any[] }>();
  contractEquipmentRaw.forEach((eq: any) => {
    const c = eq.contracts;
    if (!contractsMap.has(c.id)) {
      contractsMap.set(c.id, {
        id: c.id,
        client_name: c.client_name,
        status: c.status,
        contract_number: c.contract_number,
        monthly_payment: c.monthly_payment,
        items: [],
      });
    }
    contractsMap.get(c.id)!.items.push({
      id: eq.id,
      title: eq.title,
      quantity: eq.quantity || 1,
      serial_number: eq.serial_number,
      monthly_payment: eq.monthly_payment,
    });
  });
  const contracts = Array.from(contractsMap.values());

  if (loading) {
    return (
      <ClientPage>
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded-2xl w-1/3" style={{ background: clientColors.borderSoft }} />
          <div className="h-4 rounded-2xl w-1/2" style={{ background: clientColors.borderSoft }} />
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl" style={{ background: clientColors.borderSoft }} />)}
          </div>
        </div>
      </ClientPage>
    );
  }

  if (error) {
    return (
      <ClientPage>
        <ClientCard pad={20} style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
          <div className="flex items-center gap-3" style={{ color: "#B91C1C" }}>
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </ClientCard>
      </ClientPage>
    );
  }

  if (!clientData) {
    return (
      <ClientPage>
        <ClientEmptyState
          icon={<Package style={{ width: 48, height: 48, color: clientColors.faint }} />}
          title="Aucune information client trouvée"
          description="Veuillez contacter l'administrateur pour créer votre fiche client."
        />
      </ClientPage>
    );
  }

  // Detect equipment category from title
  const detectCategory = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes("macbook") || t.includes("laptop") || t.includes("portable") || t.includes("pc") || t.includes("ordinateur") || t.includes("desktop") || t.includes("thinkpad") || t.includes("dell") || t.includes("hp ") || t.includes("lenovo") || t.includes("mac mini") || t.includes("mac pro") || t.includes("mac studio") || t.includes("imac")) return "informatique";
    if (t.includes("iphone") || t.includes("samsung") || t.includes("téléphone") || t.includes("telephone") || t.includes("smartphone") || t.includes("galaxy") || t.includes("pixel")) return "telephonie";
    if (t.includes("écran") || t.includes("ecran") || t.includes("monitor") || t.includes("display")) return "ecrans";
    if (t.includes("imprimante") || t.includes("scanner") || t.includes("printer")) return "impression";
    if (t.includes("tablette") || t.includes("ipad") || t.includes("tab")) return "tablettes";
    return "autre";
  };

  // Only PCs, Macs, tablets and smartphones can have software installed
  const canInstallSoftware = (title: string): boolean => {
    const cat = detectCategory(title);
    return ["informatique", "telephonie", "tablettes"].includes(cat);
  };

  const categoryLabels: Record<string, string> = {
    all: "Tous les types",
    informatique: "Informatique",
    telephonie: "Téléphonie",
    ecrans: "Écrans / Moniteurs",
    impression: "Impression",
    tablettes: "Tablettes",
    autre: "Autre",
  };

  // Build flat equipment list from contract_equipment data
  const allEquipment = contractEquipmentRaw.map((eq: any) => ({
    id: eq.id,
    name: eq.title || "Équipement",
    serial: eq.serial_number || "—",
    contractRef: eq.contracts?.contract_number || eq.contract_id?.slice(0, 8) || "—",
    contractId: eq.contract_id,
    quantity: eq.quantity || 1,
    monthlyPayment: eq.monthly_payment || null,
    category: detectCategory(eq.title || ""),
  }));

  // Collect present categories for the filter
  const presentCategories: string[] = Array.from(new Set(allEquipment.map((e) => e.category)));

  const filteredEquipment = allEquipment.filter(
    (e) =>
      (categoryFilter === "all" || e.category === categoryFilter) &&
      (e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       e.serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
       e.contractRef.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const fmtEur = (n: number | null | undefined) =>
    n != null ? `${Number(n).toFixed(2)} €/mois` : "—";

  return (
    <ClientPage>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <ClientPageHeader
            title="Gestion des équipements"
            subtitle="Assignez votre matériel à vos collaborateurs et suivez le parc."
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SegmentedTabs value={activeTab} onChange={setActiveTab} />

            {/* ── Assignation (drag-drop collaborateurs / non assignés) ── */}
            <TabsContent value="assign">
              <ClientCard pad={16}>
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: clientColors.ink, display: "flex", alignItems: "center", gap: 8 }}>
                    <Users style={{ width: 18, height: 18, color: clientColors.indigo }} />
                    Assignation aux collaborateurs
                  </h2>
                  <p style={{ fontSize: 12.5, color: clientColors.muted, margin: "4px 0 0" }}>
                    Glissez-déposez votre matériel contractuel vers un collaborateur ou vers « Non assignés ».
                  </p>
                </div>
                <EquipmentDragDropManager clientId={clientData.id} readOnly={false} />
              </ClientCard>
            </TabsContent>

            {/* ── Par contrat ── */}
            <TabsContent value="by-contract">
              <div className="space-y-4">
                {contracts.length === 0 ? (
                  <ClientEmptyState
                    icon={<FileText style={{ width: 40, height: 40, color: clientColors.faint }} />}
                    title="Aucun contrat actif"
                  />
                ) : (
                  contracts.map((contract) => {
                    const items = contract.items;
                    return (
                      <ClientCard key={contract.id} pad={18}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FileText style={{ width: 16, height: 16, color: clientColors.indigo }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink }}>
                              Contrat {contract.contract_number || contract.id.slice(0, 8)}
                            </span>
                            <span style={{ fontSize: 12.5, color: clientColors.muted }}>
                              · {items.length} équipement{items.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: clientColors.ink }}>
                            {fmtEur(contract.monthly_payment)}
                          </span>
                        </div>
                        {items.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {items.map((item: any) => {
                              const cat = detectCategory(item.title || "");
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    padding: "11px 13px",
                                    borderRadius: 12,
                                    background: clientColors.surface,
                                    border: `1px solid ${clientColors.borderSoft}`,
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                                    <Laptop style={{ width: 17, height: 17, color: clientColors.faint, flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ fontSize: 13.5, fontWeight: 600, color: clientColors.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.title || "Équipement"}
                                      </p>
                                      <p style={{ fontSize: 11.5, color: clientColors.muted, margin: "2px 0 0" }}>
                                        {item.serial_number ? `S/N ${item.serial_number}` : "Sans N° de série"}
                                        {item.quantity > 1 && ` · Qté ${item.quantity}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                    <CategoryChip category={cat} />
                                    {item.monthly_payment != null && (
                                      <span style={{ fontSize: 12, color: clientColors.muted }}>{fmtEur(item.monthly_payment)}</span>
                                    )}
                                    {canInstallSoftware(item.title || "") && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 text-xs h-8"
                                        style={{ color: clientColors.indigo }}
                                        onClick={() => {
                                          setSelectedEquipment({
                                            id: item.id,
                                            name: item.title || "Équipement",
                                            contractRef: contract.contract_number || contract.id.slice(0, 8),
                                          });
                                          setDeployWizardOpen(true);
                                        }}
                                      >
                                        <Download className="h-3 w-3" /> Installer
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1 text-xs h-8"
                                      style={{ color: clientColors.indigo }}
                                      onClick={() =>
                                        openAssistance({
                                          id: item.id,
                                          name: item.title || "Équipement",
                                          serial: item.serial_number,
                                          contractRef: contract.contract_number || contract.id.slice(0, 8),
                                        })
                                      }
                                    >
                                      <Headset className="h-3 w-3" /> Assistance
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: 13, color: clientColors.muted, margin: 0 }}>Aucun équipement assigné</p>
                        )}
                      </ClientCard>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* ── Liste complète ── */}
            <TabsContent value="by-equipment">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: clientColors.faint }} />
                    <Input
                      placeholder="Rechercher un équipement..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 rounded-xl"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px] rounded-xl gap-2">
                      <Filter className="h-4 w-4" style={{ color: clientColors.faint }} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{categoryLabels.all}</SelectItem>
                      {presentCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat] || cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredEquipment.length === 0 ? (
                  <ClientEmptyState
                    icon={<Cpu style={{ width: 40, height: 40, color: clientColors.faint }} />}
                    title="Aucun équipement trouvé"
                  />
                ) : (
                  <ClientCard pad={0} style={{ overflow: "hidden" }}>
                    {/* En-tête grille */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.6fr 1fr 0.9fr 1fr 0.7fr 150px",
                        gap: 12,
                        padding: "12px 18px",
                        borderBottom: `1px solid ${clientColors.border}`,
                        background: clientColors.surface,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".03em",
                        color: clientColors.faint,
                      }}
                    >
                      <span>Équipement</span>
                      <span>N° de série</span>
                      <span>Contrat</span>
                      <span>Catégorie</span>
                      <span style={{ textAlign: "right" }}>€/mois</span>
                      <span />
                    </div>
                    {filteredEquipment.map((eq) => (
                      <div
                        key={eq.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.6fr 1fr 0.9fr 1fr 0.7fr 150px",
                          gap: 12,
                          padding: "12px 18px",
                          borderBottom: `1px solid ${clientColors.borderSoft}`,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                          <Laptop style={{ width: 16, height: 16, color: clientColors.faint, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: clientColors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {eq.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 12.5, color: clientColors.muted, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {eq.serial}
                        </span>
                        <span style={{ fontSize: 12.5, color: clientColors.muted }}>{eq.contractRef}</span>
                        <span><CategoryChip category={eq.category} /></span>
                        <span style={{ fontSize: 12.5, color: clientColors.muted, textAlign: "right" }}>
                          {eq.monthlyPayment != null ? `${Number(eq.monthlyPayment).toFixed(2)} €` : "—"}
                        </span>
                        <span style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                          {canInstallSoftware(eq.name) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8 w-8 p-0"
                              style={{ color: clientColors.indigo }}
                              title="Installer un logiciel"
                              onClick={() => {
                                setSelectedEquipment({ id: eq.id, name: eq.name, contractRef: eq.contractRef });
                                setDeployWizardOpen(true);
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs h-8"
                            style={{ color: clientColors.indigo }}
                            title="Demander une assistance"
                            onClick={() => openAssistance({ id: eq.id, name: eq.name, serial: eq.serial, contractRef: eq.contractRef })}
                          >
                            <Headset className="h-3.5 w-3.5" /> Assistance
                          </Button>
                        </span>
                      </div>
                    ))}
                  </ClientCard>
                )}
              </div>
            </TabsContent>

            {/* ── Emplacements ── */}
            <TabsContent value="locations">
              <ClientCard pad={16}>
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: clientColors.ink, display: "flex", alignItems: "center", gap: 8 }}>
                    <MapPin style={{ width: 18, height: 18, color: clientColors.indigo }} />
                    Gestion des emplacements
                  </h2>
                  <p style={{ fontSize: 12.5, color: clientColors.muted, margin: "4px 0 0" }}>
                    Définissez vos sites et emplacements pour organiser vos équipements.
                  </p>
                </div>
                <LocationManager clientId={clientData.id} companyId={(clientData as any).company_id} />
              </ClientCard>
            </TabsContent>

            {/* ── Matériel hors contrat (parc externe déclaré par le client) ── */}
            <TabsContent value="owned">
              <ClientOwnedEquipmentTab clientId={clientData.id} companyId={(clientData as any).company_id} />
            </TabsContent>

            {/* ── Logiciels (préservé via defaultTab="software") ── */}
            <TabsContent value="software">
              <ClientSoftwareTab
                clientId={clientData.id}
                companyId={(clientData as any).company_id}
                equipment={allEquipment}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      <EquipmentAssistanceDialog
        open={assistanceOpen}
        onOpenChange={setAssistanceOpen}
        equipment={assistanceEquipment}
        clientId={clientData.id}
        companyId={(clientData as any).company_id}
      />

      {selectedEquipment && (
        <SoftwareDeploymentWizard
          open={deployWizardOpen}
          onOpenChange={setDeployWizardOpen}
          equipment={selectedEquipment}
        />
      )}
    </ClientPage>
  );
};

export default ClientEquipmentPage;

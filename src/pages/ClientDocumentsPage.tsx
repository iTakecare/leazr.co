/**
 * ClientDocumentsPage
 *
 * Vue consolidée de tous les documents clients :
 *  • Tous les documents de toutes les demandes, groupés par client
 *  • Filtres par client, type, statut
 *  • Upload admin de documents (attachés à une demande spécifique)
 *  • Téléchargement direct
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAllClients } from "@/services/clientService";
import {
  downloadDocument,
  DOCUMENT_TYPES,
  ADDITIONAL_DOCUMENT_TYPES,
} from "@/services/offers/offerDocuments";
import type { Client } from "@/types/client";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  Upload,
  Download,
  FileText,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Loader2,
  X,
  ChevronRight,
  Building2,
  FileCheck,
  FilePlus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocWithOffer {
  id: string;
  offer_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: string;
  status: "pending" | "approved" | "rejected";
  admin_notes?: string;
  created_at: string;
  // From joined offer
  client_id: string | null;
  client_name: string | null;
  dossier_number: string | null;
}

interface OfferOption {
  id: string;
  dossier_number: string | null;
  client_name: string | null;
  created_at: string;
}

const ALL_DOC_TYPES = { ...DOCUMENT_TYPES, ...ADDITIONAL_DOCUMENT_TYPES };

const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  approved: {
    label: "Approuvé",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  rejected: {
    label: "Refusé",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docTypeLabel(type: string) {
  return ALL_DOC_TYPES[type] ?? type;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ClientDocumentsPage: React.FC = () => {
  const { user } = useAuth();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [docs, setDocs] = useState<DocWithOffer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // ── Upload modal ──────────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploadOfferId, setUploadOfferId] = useState("");
  const [uploadDocType, setUploadDocType] = useState("other");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOffers, setUploadOffers] = useState<OfferOption[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load all documents ────────────────────────────────────────────────────
  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("offer_documents")
        .select(
          `id, offer_id, document_type, file_name, file_path, file_size,
           mime_type, uploaded_by, status, admin_notes, created_at,
           offers!inner(id, client_id, client_name, dossier_number)`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: DocWithOffer[] = (data ?? []).map((d: any) => ({
        id: d.id,
        offer_id: d.offer_id,
        document_type: d.document_type,
        file_name: d.file_name,
        file_path: d.file_path,
        file_size: d.file_size,
        mime_type: d.mime_type,
        uploaded_by: d.uploaded_by,
        status: d.status,
        admin_notes: d.admin_notes,
        created_at: d.created_at,
        client_id: d.offers?.client_id ?? null,
        client_name: d.offers?.client_name ?? null,
        dossier_number: d.offers?.dossier_number ?? null,
      }));

      setDocs(mapped);
    } catch (e: any) {
      toast.error("Erreur chargement documents : " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    const data = await getAllClients();
    setClients(data ?? []);
  }, []);

  useEffect(() => {
    loadDocs();
    loadClients();
  }, [loadDocs, loadClients]);

  // ── Load offers when client changes (upload modal) ────────────────────────
  useEffect(() => {
    if (!uploadClientId) {
      setUploadOffers([]);
      setUploadOfferId("");
      return;
    }
    const load = async () => {
      setLoadingOffers(true);
      const { data } = await supabase
        .from("offers")
        .select("id, dossier_number, client_name, created_at")
        .eq("client_id", uploadClientId)
        .order("created_at", { ascending: false });
      setUploadOffers((data as OfferOption[]) ?? []);
      setUploadOfferId("");
      setLoadingOffers(false);
    };
    load();
  }, [uploadClientId]);

  // ── Derived: client doc counts ────────────────────────────────────────────
  const clientDocCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    docs.forEach((d) => {
      const key = d.client_id ?? "__unknown__";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [docs]);

  // ── Filtered docs ─────────────────────────────────────────────────────────
  const filteredDocs = React.useMemo(() => {
    return docs.filter((d) => {
      if (selectedClientId !== "all" && d.client_id !== selectedClientId) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.document_type !== typeFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          d.file_name.toLowerCase().includes(q) ||
          (d.client_name ?? "").toLowerCase().includes(q) ||
          (d.dossier_number ?? "").toLowerCase().includes(q) ||
          docTypeLabel(d.document_type).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [docs, selectedClientId, statusFilter, typeFilter, searchTerm]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    const base = selectedClientId === "all" ? docs : docs.filter((d) => d.client_id === selectedClientId);
    return {
      total: base.length,
      pending: base.filter((d) => d.status === "pending").length,
      approved: base.filter((d) => d.status === "approved").length,
      rejected: base.filter((d) => d.status === "rejected").length,
    };
  }, [docs, selectedClientId]);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async (doc: DocWithOffer) => {
    const url = await downloadDocument(doc.file_path);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Impossible de télécharger le document");
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadOfferId) { toast.error("Sélectionnez une demande"); return; }
    if (!uploadFile) { toast.error("Sélectionnez un fichier"); return; }

    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop() ?? "bin";
      const fileName = `${uploadOfferId}/${uuidv4()}.${ext}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from("offer-documents")
        .upload(fileName, uploadFile, { contentType: uploadFile.type });

      if (uploadErr) throw new Error(uploadErr.message);

      // Insert record — approved since uploaded by admin
      const { error: insertErr } = await supabase.from("offer_documents").insert({
        offer_id: uploadOfferId,
        document_type: uploadDocType,
        file_name: uploadFile.name,
        file_path: fileName,
        file_size: uploadFile.size,
        mime_type: uploadFile.type,
        uploaded_by: user?.email ?? "admin",
        status: "approved",
      });

      if (insertErr) throw new Error(insertErr.message);

      toast.success("Document ajouté avec succès");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadClientId("");
      setUploadOfferId("");
      setUploadDocType("other");
      await loadDocs();
    } catch (e: any) {
      toast.error("Erreur upload : " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Clients sorted by doc count ───────────────────────────────────────────
  const clientsWithDocs = React.useMemo(() => {
    return clients
      .filter((c) => clientDocCounts[c.id] > 0)
      .sort((a, b) => (clientDocCounts[b.id] ?? 0) - (clientDocCounts[a.id] ?? 0));
  }, [clients, clientDocCounts]);

  // ── Selected client info ──────────────────────────────────────────────────
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <Container>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-indigo-600" />
              Documents clients
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Vue consolidée de tous les documents fournis par vos clients
            </p>
          </div>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <FilePlus className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-5">
            {/* ── Left panel: client list ──────────────────────────────── */}
            <div className="w-64 shrink-0">
              <Card className="sticky top-4">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Clients
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  {/* All clients */}
                  <button
                    onClick={() => setSelectedClientId("all")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedClientId === "all"
                        ? "bg-indigo-100 text-indigo-800 font-medium"
                        : "hover:bg-slate-100 text-foreground"
                    }`}
                  >
                    <span>Tous les clients</span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {docs.length}
                    </Badge>
                  </button>

                  <Separator className="my-2" />

                  {/* Per-client */}
                  <div className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                    {clientsWithDocs.length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-2 italic">
                        Aucun document trouvé
                      </p>
                    )}
                    {clientsWithDocs.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedClientId === client.id
                            ? "bg-indigo-100 text-indigo-800 font-medium"
                            : "hover:bg-slate-100 text-foreground"
                        }`}
                      >
                        <span className="truncate text-left">
                          {client.name || client.company || `Client ${client.id.slice(0, 6)}`}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-5 shrink-0 ml-1">
                          {clientDocCounts[client.id] ?? 0}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Main content ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-white" },
                  { label: "En attente", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50" },
                  { label: "Approuvés", value: stats.approved, color: "text-emerald-700", bg: "bg-emerald-50" },
                  { label: "Refusés", value: stats.rejected, color: "text-red-700", bg: "bg-red-50" },
                ].map(({ label, value, color, bg }) => (
                  <Card key={label} className={`${bg} border`}>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, client, demande…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-2.5"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm w-[150px]">
                    <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvés</SelectItem>
                    <SelectItem value="rejected">Refusés</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 text-sm w-[190px]">
                    <FileText className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {Object.entries(ALL_DOC_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document table */}
              {filteredDocs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">Aucun document trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedClientId !== "all"
                        ? "Ce client n'a pas encore fourni de documents"
                        : "Aucun document ne correspond aux filtres"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Document
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Type
                          </th>
                          {selectedClientId === "all" && (
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Client
                            </th>
                          )}
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Demande
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Statut
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Date
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Taille
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocs.map((doc, idx) => {
                          const st = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending;
                          const StIcon = st.icon;
                          return (
                            <tr
                              key={doc.id}
                              className={`border-b last:border-0 hover:bg-slate-50 transition-colors ${
                                idx % 2 === 0 ? "" : "bg-slate-50/40"
                              }`}
                            >
                              {/* Document name */}
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                                  <span className="font-medium truncate max-w-[200px]" title={doc.file_name}>
                                    {doc.file_name}
                                  </span>
                                </div>
                              </td>

                              {/* Type */}
                              <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                {docTypeLabel(doc.document_type)}
                              </td>

                              {/* Client (only when showing all) */}
                              {selectedClientId === "all" && (
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="truncate max-w-[140px]" title={doc.client_name ?? ""}>
                                      {doc.client_name ?? "—"}
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* Demande */}
                              <td className="px-4 py-2.5">
                                {doc.dossier_number ? (
                                  <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                    {doc.dossier_number}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}
                                >
                                  <StIcon className="h-3 w-3" />
                                  {st.label}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })}
                              </td>

                              {/* Size */}
                              <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                {fmtSize(doc.file_size)}
                              </td>

                              {/* Download */}
                              <td className="px-4 py-2.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDownload(doc)}
                                  title="Télécharger"
                                >
                                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer count */}
                  <div className="px-4 py-2.5 border-t text-xs text-muted-foreground">
                    {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
                    {filteredDocs.length < docs.length && ` (sur ${docs.length} au total)`}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── Upload modal ──────────────────────────────────────────────── */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-indigo-600" />
                Ajouter un document client
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Client */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Client *</Label>
                <Select value={uploadClientId} onValueChange={setUploadClientId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || c.company || c.email || c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Demande */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Demande liée *</Label>
                <Select
                  value={uploadOfferId}
                  onValueChange={setUploadOfferId}
                  disabled={!uploadClientId || loadingOffers}
                >
                  <SelectTrigger className="h-9">
                    {loadingOffers ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Chargement…
                      </span>
                    ) : (
                      <SelectValue placeholder={uploadClientId ? "Sélectionner une demande" : "Choisir un client d'abord"} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {uploadOffers.length === 0 && !loadingOffers && (
                      <div className="px-3 py-2 text-sm text-muted-foreground italic">
                        Aucune demande pour ce client
                      </div>
                    )}
                    {uploadOffers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.dossier_number ?? `Demande du ${format(new Date(o.created_at), "dd/MM/yyyy")}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document type */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Type de document</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALL_DOC_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Fichier *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                {uploadFile ? (
                  <div className="flex items-center justify-between px-3 py-2 border rounded-md bg-slate-50 text-sm">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      <span className="truncate max-w-[220px]">{uploadFile.name}</span>
                    </div>
                    <button onClick={() => setUploadFile(null)}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-lg py-5 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour sélectionner un fichier
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">PDF, images, Word, Excel</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground bg-indigo-50 border border-indigo-100 rounded px-3 py-2">
                Les documents ajoutés par un administrateur sont automatiquement marqués comme{" "}
                <strong>approuvés</strong>.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Annuler
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !uploadOfferId || !uploadFile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Envoi…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Ajouter</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Container>
    </PageTransition>
  );
};

export default ClientDocumentsPage;

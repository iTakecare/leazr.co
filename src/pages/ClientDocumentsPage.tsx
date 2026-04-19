/**
 * ClientDocumentsPage
 *
 * Vue consolidée de tous les documents clients en arborescence :
 *   📁 Client
 *     📂 Demande ITC-2026-xxxx
 *       📄 Document 1
 *       📄 Document 2
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
  Folder,
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
  ChevronDown,
  Building2,
  FileCheck,
  FilePlus,
  FolderKanban,
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
  client_id: string | null;
  client_name: string | null;
  dossier_number: string | null;
}

// Grouped structure
interface OfferGroup {
  offer_id: string;
  dossier_number: string | null;
  docs: DocWithOffer[];
}
interface ClientGroup {
  client_id: string | null;
  client_name: string | null;
  offers: OfferGroup[];
  totalDocs: number;
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
    badge: "bg-amber-50 border-amber-200 text-amber-700",
  },
  approved: {
    label: "Approuvé",
    icon: CheckCircle2,
    color: "text-emerald-600",
    badge: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  rejected: {
    label: "Refusé",
    icon: XCircle,
    color: "text-red-600",
    badge: "bg-red-50 border-red-200 text-red-700",
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

/** Group flat docs into ClientGroup[] */
function groupDocs(docs: DocWithOffer[]): ClientGroup[] {
  const clientMap = new Map<string, ClientGroup>();

  for (const doc of docs) {
    const cKey = doc.client_id ?? "__unknown__";
    if (!clientMap.has(cKey)) {
      clientMap.set(cKey, {
        client_id: doc.client_id,
        client_name: doc.client_name,
        offers: [],
        totalDocs: 0,
      });
    }
    const cGroup = clientMap.get(cKey)!;
    cGroup.totalDocs++;

    let oGroup = cGroup.offers.find((o) => o.offer_id === doc.offer_id);
    if (!oGroup) {
      oGroup = { offer_id: doc.offer_id, dossier_number: doc.dossier_number, docs: [] };
      cGroup.offers.push(oGroup);
    }
    oGroup.docs.push(doc);
  }

  // Sort clients by totalDocs desc
  return Array.from(clientMap.values()).sort((a, b) => b.totalDocs - a.totalDocs);
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

  // ── Tree expand state ─────────────────────────────────────────────────────
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());

  // ── Upload modal ──────────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploadClientLabel, setUploadClientLabel] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [uploadOfferId, setUploadOfferId] = useState("");
  const [uploadDocType, setUploadDocType] = useState("other");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOffers, setUploadOffers] = useState<OfferOption[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientSearchRef = useRef<HTMLInputElement>(null);

  // ── Load docs ─────────────────────────────────────────────────────────────
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

      // Auto-expand all clients by default
      const clientIds = new Set(mapped.map((d) => d.client_id ?? "__unknown__"));
      setExpandedClients(clientIds);
      // Auto-expand offers for single-client view
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

  // ── Load offers for upload modal ──────────────────────────────────────────
  useEffect(() => {
    if (!uploadClientId) { setUploadOffers([]); setUploadOfferId(""); return; }
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

  // ── Grouped tree ──────────────────────────────────────────────────────────
  const groupedDocs = React.useMemo(() => groupDocs(filteredDocs), [filteredDocs]);

  // Liste aplatie dans l'ordre d'affichage (pour navigation preview)
  const orderedDocs = React.useMemo(() => {
    const arr: DocWithOffer[] = [];
    for (const c of groupedDocs) {
      for (const o of c.offers) {
        for (const d of o.docs) arr.push(d);
      }
    }
    return arr;
  }, [groupedDocs]);

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

  // ── Client doc counts ─────────────────────────────────────────────────────
  const clientDocCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    docs.forEach((d) => {
      const key = d.client_id ?? "__unknown__";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [docs]);

  const clientsWithDocs = React.useMemo(() =>
    clients
      .filter((c) => clientDocCounts[c.id] > 0)
      .sort((a, b) => (clientDocCounts[b.id] ?? 0) - (clientDocCounts[a.id] ?? 0)),
    [clients, clientDocCounts]
  );

  // ── Tree toggles ──────────────────────────────────────────────────────────
  const toggleClient = (cKey: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      next.has(cKey) ? next.delete(cKey) : next.add(cKey);
      return next;
    });
  };
  const toggleOffer = (oId: string) => {
    setExpandedOffers((prev) => {
      const next = new Set(prev);
      next.has(oId) ? next.delete(oId) : next.add(oId);
      return next;
    });
  };

  // ── Preview modal ─────────────────────────────────────────────────────────
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewDoc = previewIdx !== null ? orderedDocs[previewIdx] ?? null : null;

  const loadPreviewUrl = useCallback(async (doc: DocWithOffer) => {
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const { data } = await supabase.storage
        .from("offer-documents")
        .createSignedUrl(doc.file_path, 3600);
      setPreviewUrl(data?.signedUrl ?? null);
    } catch {
      toast.error("Impossible de charger l'aperçu");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handlePreview = async (doc: DocWithOffer) => {
    const idx = orderedDocs.findIndex((d) => d.id === doc.id);
    if (idx === -1) return;
    setPreviewIdx(idx);
    await loadPreviewUrl(doc);
  };

  const closePreview = () => { setPreviewIdx(null); setPreviewUrl(null); };

  const goPrev = useCallback(() => {
    if (previewIdx === null) return;
    const next = previewIdx - 1;
    if (next < 0) return;
    setPreviewIdx(next);
    loadPreviewUrl(orderedDocs[next]);
  }, [previewIdx, orderedDocs, loadPreviewUrl]);

  const goNext = useCallback(() => {
    if (previewIdx === null) return;
    const next = previewIdx + 1;
    if (next >= orderedDocs.length) return;
    setPreviewIdx(next);
    loadPreviewUrl(orderedDocs[next]);
  }, [previewIdx, orderedDocs, loadPreviewUrl]);

  // Raccourcis clavier dans la modale
  useEffect(() => {
    if (previewIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewIdx, goPrev, goNext]);

  const isImage = (doc: DocWithOffer) =>
    doc.mime_type?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.file_name);
  const isPdf = (doc: DocWithOffer) =>
    doc.mime_type === "application/pdf" || /\.pdf$/i.test(doc.file_name);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async (doc: DocWithOffer) => {
    const url = await downloadDocument(doc.file_path);
    if (url) window.open(url, "_blank");
    else toast.error("Impossible de télécharger");
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadOfferId) { toast.error("Sélectionnez une demande"); return; }
    if (!uploadFile) { toast.error("Sélectionnez un fichier"); return; }
    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop() ?? "bin";
      const fileName = `${uploadOfferId}/${uuidv4()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("offer-documents")
        .upload(fileName, uploadFile, { contentType: uploadFile.type });
      if (uploadErr) throw new Error(uploadErr.message);

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

      toast.success("Document ajouté");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadClientId("");
      setUploadOfferId("");
      setUploadDocType("other");
      await loadDocs();
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Client search for upload modal ────────────────────────────────────────
  const filteredClientsForUpload = React.useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 50);
    const q = clientSearch.toLowerCase();
    return clients.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.vat_number ?? "").toLowerCase().includes(q) ||
      (c.first_name ?? "").toLowerCase().includes(q) ||
      (c.last_name ?? "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [clients, clientSearch]);

  const selectUploadClient = (c: Client) => {
    setUploadClientId(c.id);
    setUploadClientLabel(
      [c.name || [c.first_name, c.last_name].filter(Boolean).join(" "), c.company]
        .filter(Boolean).join(" — ") || c.email || c.id.slice(0, 8)
    );
    setClientSearch("");
    setClientDropdownOpen(false);
    setUploadOfferId("");
  };

  const clearUploadClient = () => {
    setUploadClientId("");
    setUploadClientLabel("");
    setClientSearch("");
    setUploadOfferId("");
  };

  // ── Expand all / collapse all helpers ─────────────────────────────────────
  const expandAll = () => {
    setExpandedClients(new Set(groupedDocs.map((g) => g.client_id ?? "__unknown__")));
    setExpandedOffers(new Set(groupedDocs.flatMap((g) => g.offers.map((o) => o.offer_id))));
  };
  const collapseAll = () => {
    setExpandedClients(new Set());
    setExpandedOffers(new Set());
  };

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
              Vue consolidée de tous les documents par client et par demande
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
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

            {/* ── Left panel ──────────────────────────────────────────── */}
            <div className="w-60 shrink-0">
              <Card className="sticky top-4">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Clients
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <button
                    onClick={() => setSelectedClientId("all")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedClientId === "all"
                        ? "bg-indigo-100 text-indigo-800 font-medium"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <span>Tous les clients</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{docs.length}</Badge>
                  </button>
                  <Separator className="my-2" />
                  <div className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                    {clientsWithDocs.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedClientId === client.id
                            ? "bg-indigo-100 text-indigo-800 font-medium"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate text-left">
                          {client.name || client.company || client.email || client.id.slice(0, 8)}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-5 shrink-0 ml-1">
                          {clientDocCounts[client.id] ?? 0}
                        </Badge>
                      </button>
                    ))}
                    {clientsWithDocs.length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-2 italic">Aucun document</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Right panel ──────────────────────────────────────────── */}
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

              {/* Filters + tree controls */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-2.5">
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm w-[145px]">
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
                  <SelectTrigger className="h-9 text-sm w-[175px]">
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
                <div className="flex items-center gap-1 ml-1">
                  <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={expandAll}>
                    Tout ouvrir
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={collapseAll}>
                    Tout fermer
                  </Button>
                </div>
              </div>

              {/* Tree */}
              {groupedDocs.length === 0 ? (
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
                <div className="space-y-2">
                  {groupedDocs.map((cGroup) => {
                    const cKey = cGroup.client_id ?? "__unknown__";
                    const isClientOpen = expandedClients.has(cKey);

                    return (
                      <Card key={cKey} className="overflow-hidden">
                        {/* ── Client row ───────────────────────────────── */}
                        <button
                          onClick={() => toggleClient(cKey)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b text-left"
                        >
                          {isClientOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          }
                          {isClientOpen
                            ? <FolderOpen className="h-5 w-5 text-indigo-500 shrink-0" />
                            : <Folder className="h-5 w-5 text-indigo-400 shrink-0" />
                          }
                          <span className="font-semibold text-sm flex-1">
                            {cGroup.client_name ?? "Client inconnu"}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {cGroup.totalDocs} doc{cGroup.totalDocs !== 1 ? "s" : ""}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-muted-foreground ml-1">
                            {cGroup.offers.length} demande{cGroup.offers.length !== 1 ? "s" : ""}
                          </Badge>
                        </button>

                        {/* ── Offers ───────────────────────────────────── */}
                        {isClientOpen && (
                          <div className="divide-y">
                            {cGroup.offers.map((oGroup) => {
                              const isOfferOpen = expandedOffers.has(oGroup.offer_id);

                              return (
                                <div key={oGroup.offer_id}>
                                  {/* Offer row */}
                                  <button
                                    onClick={() => toggleOffer(oGroup.offer_id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 pl-8 hover:bg-slate-50 transition-colors text-left"
                                  >
                                    {isOfferOpen
                                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    }
                                    <FolderKanban className={`h-4 w-4 shrink-0 ${isOfferOpen ? "text-amber-500" : "text-amber-400"}`} />
                                    <span className="text-sm font-medium flex-1">
                                      {oGroup.dossier_number
                                        ? <span className="font-mono">{oGroup.dossier_number}</span>
                                        : <span className="text-muted-foreground italic">Demande sans numéro</span>
                                      }
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {oGroup.docs.length} fichier{oGroup.docs.length !== 1 ? "s" : ""}
                                    </span>

                                    {/* Mini status dots */}
                                    <div className="flex items-center gap-1 ml-2">
                                      {oGroup.docs.filter(d => d.status === "pending").length > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">
                                          <Clock className="h-2.5 w-2.5" />
                                          {oGroup.docs.filter(d => d.status === "pending").length}
                                        </span>
                                      )}
                                      {oGroup.docs.filter(d => d.status === "approved").length > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                          <CheckCircle2 className="h-2.5 w-2.5" />
                                          {oGroup.docs.filter(d => d.status === "approved").length}
                                        </span>
                                      )}
                                      {oGroup.docs.filter(d => d.status === "rejected").length > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 rounded-full">
                                          <XCircle className="h-2.5 w-2.5" />
                                          {oGroup.docs.filter(d => d.status === "rejected").length}
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {/* Documents */}
                                  {isOfferOpen && (
                                    <div className="bg-white pl-16 pr-4 pb-1">
                                      {oGroup.docs.map((doc, idx) => {
                                        const st = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending;
                                        const StIcon = st.icon;
                                        return (
                                          <div
                                            key={doc.id}
                                            className={`flex items-center gap-3 py-2 text-sm border-b last:border-0 cursor-pointer hover:bg-indigo-50/40 transition-colors rounded -mx-4 px-4 ${
                                              idx % 2 === 0 ? "" : "bg-slate-50/50"
                                            }`}
                                            onClick={() => handlePreview(doc)}
                                            title="Cliquer pour prévisualiser"
                                          >
                                            {/* File icon */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <div className="w-px h-4 bg-slate-200" />
                                              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                            </div>

                                            {/* Name */}
                                            <span className="flex-1 truncate font-medium text-indigo-700 hover:underline" title={doc.file_name}>
                                              {doc.file_name}
                                            </span>

                                            {/* Type */}
                                            <span className="text-xs text-muted-foreground truncate max-w-[130px] hidden sm:block">
                                              {docTypeLabel(doc.document_type)}
                                            </span>

                                            {/* Status */}
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${st.badge} whitespace-nowrap shrink-0`}>
                                              <StIcon className="h-2.5 w-2.5" />
                                              {st.label}
                                            </span>

                                            {/* Size */}
                                            <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
                                              {fmtSize(doc.file_size)}
                                            </span>

                                            {/* Date */}
                                            <span className="text-xs text-muted-foreground w-20 text-right shrink-0 hidden md:block">
                                              {format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })}
                                            </span>

                                            {/* Download */}
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 shrink-0"
                                              onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                              title="Télécharger"
                                            >
                                              <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-indigo-600" />
                                            </Button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
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
              {/* Client — combobox avec recherche multi-critères */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Client *</Label>
                {uploadClientId ? (
                  /* Client sélectionné */
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-indigo-50 border-indigo-200 text-sm">
                    <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="flex-1 font-medium text-indigo-800 truncate">{uploadClientLabel}</span>
                    <button onClick={clearUploadClient} title="Changer de client">
                      <X className="h-3.5 w-3.5 text-indigo-400 hover:text-destructive" />
                    </button>
                  </div>
                ) : (
                  /* Recherche */
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={clientSearchRef}
                        value={clientSearch}
                        onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                        onFocus={() => setClientDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                        placeholder="Nom, entreprise, email, n° TVA…"
                        className="pl-8 h-9 text-sm"
                      />
                      {clientSearch && (
                        <button
                          className="absolute right-2.5 top-2.5"
                          onMouseDown={(e) => { e.preventDefault(); setClientSearch(""); }}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {clientDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {filteredClientsForUpload.length === 0 ? (
                          <p className="px-3 py-3 text-sm text-muted-foreground italic text-center">
                            Aucun client trouvé
                          </p>
                        ) : (
                          filteredClientsForUpload.map((c) => {
                            const displayName = c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id.slice(0, 8);
                            return (
                              <button
                                key={c.id}
                                onMouseDown={(e) => { e.preventDefault(); selectUploadClient(c); }}
                                className="w-full flex flex-col px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left border-b last:border-0"
                              >
                                <span className="text-sm font-medium text-foreground">{displayName}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {c.company && c.company !== c.name && (
                                    <span className="text-[11px] text-muted-foreground">{c.company}</span>
                                  )}
                                  {c.email && (
                                    <span className="text-[11px] text-muted-foreground">{c.email}</span>
                                  )}
                                  {c.vat_number && (
                                    <span className="text-[11px] font-mono text-muted-foreground">{c.vat_number}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Demande liée *</Label>
                <Select value={uploadOfferId} onValueChange={setUploadOfferId} disabled={!uploadClientId || loadingOffers}>
                  <SelectTrigger className="h-9">
                    {loadingOffers
                      ? <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Chargement…</span>
                      : <SelectValue placeholder={uploadClientId ? "Sélectionner une demande" : "Choisir un client d'abord"} />
                    }
                  </SelectTrigger>
                  <SelectContent>
                    {uploadOffers.length === 0 && !loadingOffers && (
                      <div className="px-3 py-2 text-sm text-muted-foreground italic">Aucune demande</div>
                    )}
                    {uploadOffers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.dossier_number ?? `Demande du ${format(new Date(o.created_at), "dd/MM/yyyy")}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Type de document</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALL_DOC_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Fichier *</Label>
                <input ref={fileInputRef} type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
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
                  <div onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-lg py-5 text-center cursor-pointer hover:border-indigo-300 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">Cliquez pour sélectionner</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PDF, images, Word, Excel</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground bg-indigo-50 border border-indigo-100 rounded px-3 py-2">
                Les documents ajoutés par un administrateur sont automatiquement <strong>approuvés</strong>.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Annuler</Button>
              <Button onClick={handleUpload} disabled={uploading || !uploadOfferId || !uploadFile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {uploading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Envoi…</>
                  : <><Upload className="h-4 w-4 mr-2" />Ajouter</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modale prévisualisation document ── */}
        <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) closePreview(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-3 border-b">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="truncate">{previewDoc?.file_name}</span>
              </DialogTitle>
              {previewDoc && (
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {docTypeLabel(previewDoc.document_type)} · {fmtSize(previewDoc.file_size)} ·{" "}
                    {format(new Date(previewDoc.created_at), "dd MMM yyyy", { locale: fr })}
                    {previewDoc.client_name && ` · ${previewDoc.client_name}`}
                  </p>
                  <span className="text-xs font-medium text-muted-foreground shrink-0 tabular-nums">
                    {(previewIdx ?? 0) + 1} / {orderedDocs.length}
                  </span>
                </div>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-auto min-h-0 bg-slate-50 flex items-center justify-center p-4 relative">
              {/* Bouton précédent */}
              {previewIdx !== null && previewIdx > 0 && (
                <button
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-slate-200 shadow-md rounded-full h-10 w-10 flex items-center justify-center transition-colors"
                  title="Document précédent (←)"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </button>
              )}

              {/* Bouton suivant */}
              {previewIdx !== null && previewIdx < orderedDocs.length - 1 && (
                <button
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-slate-200 shadow-md rounded-full h-10 w-10 flex items-center justify-center transition-colors"
                  title="Document suivant (→)"
                >
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </button>
              )}

              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <span className="text-sm">Chargement de l'aperçu…</span>
                </div>
              ) : previewUrl && previewDoc ? (
                isImage(previewDoc) ? (
                  <img
                    src={previewUrl}
                    alt={previewDoc.file_name}
                    className="max-w-full max-h-[60vh] object-contain rounded shadow"
                  />
                ) : isPdf(previewDoc) ? (
                  <iframe
                    src={previewUrl}
                    title={previewDoc.file_name}
                    className="w-full h-[65vh] rounded border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="text-center space-y-3">
                    <FileText className="h-16 w-16 text-slate-300 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Aperçu non disponible pour ce type de fichier.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.open(previewUrl, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Ouvrir dans un nouvel onglet
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  Impossible de charger l'aperçu
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-3 border-t bg-white flex-row items-center justify-between sm:justify-between">
              <span className="text-xs text-muted-foreground hidden sm:block">
                Utilisez ← → pour naviguer · Échap pour fermer
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={closePreview}>Fermer</Button>
                <Button
                  variant="default"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => previewDoc && handleDownload(previewDoc)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Container>
    </PageTransition>
  );
};

export default ClientDocumentsPage;

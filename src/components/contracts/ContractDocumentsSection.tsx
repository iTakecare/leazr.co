
import React, { useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ContractDocument, uploadContractDocument } from "@/services/contractService";
import { toast } from "sonner";
import { ClientCard, StatusBadge, clientColors, primaryBtnStyle, ghostBtnStyle } from "@/components/client/clientUi";

interface ContractDocumentsSectionProps {
  contractId: string;
  documents: ContractDocument[];
  onRefresh: () => void;
}

const documentTypes = [
  { value: "facture", label: "Facture" },
  { value: "bon_commande", label: "Bon de commande" },
  { value: "bon_livraison", label: "Bon de livraison" },
  { value: "contrat_signe", label: "Contrat signé" },
  { value: "autre", label: "Autre" }
];

const getDocumentTypeLabel = (type: string) => {
  const docType = documentTypes.find(dt => dt.value === type);
  return docType ? docType.label : type;
};

const docStatusMeta = (status: string): { label: string; tone: { bg: string; fg: string } } => {
  switch (status) {
    case "approved":
      return { label: "Approuvé", tone: { bg: "#E7F6F0", fg: "#047857" } };
    case "rejected":
      return { label: "Rejeté", tone: { bg: "#FEEFEF", fg: "#B91C1C" } };
    default:
      return { label: "En attente", tone: { bg: "#FFF0E6", fg: "#C2540B" } };
  }
};

const ContractDocumentsSection: React.FC<ContractDocumentsSectionProps> = ({
  contractId,
  documents,
  onRefresh
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("facture");
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const success = await uploadContractDocument(contractId, file, selectedDocumentType);

      if (success) {
        onRefresh();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = async (document: ContractDocument) => {
    try {
      toast.info("Téléchargement en cours...");
      // const { data } = await supabase.storage.from('company-assets').download(document.file_path);
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  return (
    <ClientCard pad={20}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EAF0FF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <FileText size={17} color={clientColors.indigo} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: clientColors.ink }}>
          Documents ({documents.length})
        </span>
      </div>

      {/* Upload */}
      <div style={{ border: `1.5px dashed ${clientColors.border}`, borderRadius: 14, padding: 16, background: clientColors.surface }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: clientColors.ink, marginBottom: 12 }}>Ajouter un document</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={handleUploadClick}
            disabled={uploading}
            style={{ ...primaryBtnStyle, opacity: uploading ? 0.7 : 1 }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Upload en cours..." : "Choisir un fichier"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
        </div>
      </div>

      {/* Liste */}
      {documents.length === 0 ? (
        <p style={{ fontSize: 13, color: clientColors.muted, textAlign: "center", padding: "28px 0 8px", margin: 0 }}>
          Aucun document uploadé pour ce contrat.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {documents.map((doc) => {
            const meta = docStatusMeta(doc.status);
            return (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: `1px solid ${clientColors.borderSoft}`, borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <FileText size={18} color={clientColors.faint} style={{ flex: "none" }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: clientColors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_name}</div>
                    <div style={{ fontSize: 12, color: clientColors.muted, marginTop: 2 }}>
                      {getDocumentTypeLabel(doc.document_type)} · {(doc.file_size / 1024 / 1024).toFixed(2)} MB · {formatDate(doc.uploaded_at)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                  <StatusBadge status={doc.status} label={meta.label} tone={meta.tone} />
                  <button style={{ ...ghostBtnStyle, height: 32, padding: "0 10px" }} onClick={() => handleDownload(doc)} title="Télécharger">
                    <Download size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ClientCard>
  );
};

export default ContractDocumentsSection;

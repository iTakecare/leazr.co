
import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ContractDocument, uploadContractDocument } from "@/services/contractService";
import { toast } from "sonner";

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

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
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
        // Reset le file input
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
      // Ici, vous pourriez implémenter le téléchargement depuis Supabase Storage
      toast.info("Téléchargement en cours...");
      // const { data } = await supabase.storage.from('company-assets').download(document.file_path);
      // ... logique de téléchargement
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section d'upload */}
        <div className="border-2 border-dashed rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Ajouter un document</h4>
          <div className="flex items-center gap-4">
            <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
              <SelectTrigger className="w-48">
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
            
            <Button 
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Upload en cours..." : "Choisir un fichier"}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </div>
        </div>

        {/* Liste des documents */}
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun document uploadé pour ce contrat.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{doc.file_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {getDocumentTypeLabel(doc.document_type)} • 
                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB • 
                      {formatDate(doc.uploaded_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(doc.status)}>
                    {doc.status === 'pending' ? 'En attente' : 
                     doc.status === 'approved' ? 'Approuvé' : 
                     doc.status === 'rejected' ? 'Rejeté' : doc.status}
                  </Badge>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractDocumentsSection;

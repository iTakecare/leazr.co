import React, { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OfferDocument } from "@/services/offers/offerDocuments";
import { DOCUMENT_TYPES } from "@/services/offers/offerDocuments";

interface DocumentUploadSectionProps {
  documents: OfferDocument[];
  uploadLinks: any[];
  loading: boolean;
}

export const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  documents,
  uploadLinks,
  loading
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50/80">En attente</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted/50 rounded-lg"></div>
            <div className="h-16 bg-muted/50 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasUploadLinks = uploadLinks.length > 0;
  const hasDocuments = documents.length > 0;

  // Vérifier si tous les documents requis ont été fournis et approuvés
  const areAllDocumentsApproved = () => {
    if (!hasUploadLinks) return false;
    
    // Collecter tous les documents requis de tous les liens d'upload
    const allRequestedDocs = uploadLinks.flatMap(link => link.requested_documents);
    
    // Vérifier que chaque document requis a été fourni et approuvé
    return allRequestedDocs.every(docType => {
      const correspondingDoc = documents.find(doc => doc.document_type === docType);
      return correspondingDoc && correspondingDoc.status === 'approved';
    });
  };

  const shouldShowUploadSection = hasUploadLinks && !areAllDocumentsApproved();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Links */}
        {shouldShowUploadSection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <Upload className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Documents requis</h3>
                  <p className="text-sm text-blue-700">
                    Des documents complémentaires sont requis pour traiter votre demande.
                  </p>
                </div>
              </div>

              {uploadLinks.map((link, index) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg p-4 border border-blue-200 mb-3"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Documents à fournir ({link.requested_documents.length})
                      </h4>
                      <p className="text-xs text-gray-500">
                        Expire le {formatDate(link.expires_at)}
                      </p>
                    </div>
                    <Button
                      onClick={() => window.open(`/offer/documents/upload/${link.token}`, '_blank')}
                      size="sm"
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </Button>
                  </div>

                  {link.custom_message && (
                    <div className="bg-blue-50 rounded-md p-3 mb-3">
                      <p className="text-sm text-blue-800">{link.custom_message}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {link.requested_documents.map((docType: string, docIndex: number) => (
                      <div key={docIndex} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span>{DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES] || docType}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Uploaded Documents */}
        {hasDocuments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: hasUploadLinks ? 0.3 : 0 }}
            className="space-y-4"
          >
            <h3 className="font-medium text-foreground mb-3">Documents fournis</h3>
            
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(doc.status)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{doc.file_name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES] || doc.document_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                    {doc.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Note: {doc.admin_notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(doc.status)}
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!hasUploadLinks && !hasDocuments && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Aucun document requis</h3>
            <p className="text-muted-foreground">
              Aucun document complémentaire n'est nécessaire pour cette demande.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
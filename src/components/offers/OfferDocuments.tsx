import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Check, 
  X, 
  Eye,
  MessageSquare,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import {
  getOfferDocuments,
  updateDocumentStatus,
  downloadDocument,
  OfferDocument,
  DOCUMENT_TYPES
} from "@/services/offers/offerDocuments";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import OfferDocumentDebugger from "@/components/offers/OfferDocumentDebugger";

interface OfferDocumentsProps {
  offerId: string;
}

const OfferDocuments: React.FC<OfferDocumentsProps> = ({ offerId }) => {
  const [documents, setDocuments] = useState<OfferDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingDoc, setUpdatingDoc] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadDocuments();
  }, [offerId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getOfferDocuments(offerId);
      setDocuments(docs);
    } catch (error) {
      console.error("Erreur lors du chargement des documents:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    documentId: string, 
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      setUpdatingDoc(documentId);
      const success = await updateDocumentStatus(documentId, status, notes);
      
      if (success) {
        await loadDocuments();
        toast.success(`Document ${status === 'approved' ? 'approuvé' : 'rejeté'}`);
        setAdminNotes(prev => ({ ...prev, [documentId]: '' }));
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdatingDoc(null);
    }
  };

  const handleDownload = async (document: OfferDocument) => {
    try {
      const url = await downloadDocument(document.file_path);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error("Erreur lors du téléchargement");
      }
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejeté</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
    }
  };

  const getDocumentTypeName = (docType: string) => {
    if (docType.startsWith('custom:')) {
      return docType.replace('custom:', '');
    }
    return DOCUMENT_TYPES[docType] || docType;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>

        {/* Ajouter le débogueur de documents */}
        {process.env.NODE_ENV === 'development' && (
          <OfferDocumentDebugger offerId={offerId} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Documents ({documents.length})
          </CardTitle>
          <CardDescription>
            Documents administratifs uploadés par le client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Aucun document uploadé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{getDocumentTypeName(doc.document_type)}</span>
                        {getStatusBadge(doc.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">
                        Uploadé le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                        {doc.uploaded_by && ` par ${doc.uploaded_by}`}
                      </p>
                      {doc.admin_notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <strong>Notes admin:</strong> {doc.admin_notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {doc.status === 'pending' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Révision du document</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Notes administratives</label>
                                <Textarea
                                  value={adminNotes[doc.id] || ''}
                                  onChange={(e) => setAdminNotes(prev => ({
                                    ...prev,
                                    [doc.id]: e.target.value
                                  }))}
                                  placeholder="Ajoutez des notes sur ce document..."
                                  className="mt-1"
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleStatusUpdate(doc.id, 'approved', adminNotes[doc.id])}
                                  disabled={updatingDoc === doc.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Approuver
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(doc.id, 'rejected', adminNotes[doc.id])}
                                  disabled={updatingDoc === doc.id}
                                  variant="destructive"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Rejeter
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajouter le débogueur de documents */}
      {process.env.NODE_ENV === 'development' && (
        <OfferDocumentDebugger offerId={offerId} />
      )}
    </div>
  );
};

export default OfferDocuments;

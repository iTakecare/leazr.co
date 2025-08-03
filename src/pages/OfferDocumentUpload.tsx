
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  X,
  Download,
  Clock,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { 
  validateUploadToken, 
  uploadDocument, 
  DOCUMENT_TYPES,
  OfferUploadLink,
  markLinkAsUsed,
  getOfferDocuments,
  OfferDocument
} from "@/services/offers/offerDocuments";
import { getCompanyByOfferId, CompanyInfo } from "@/services/companyService";

interface DocumentStatus {
  docType: string;
  documentName: string;
  status: 'missing' | 'pending' | 'approved' | 'rejected';
  document?: OfferDocument;
  adminNotes?: string;
}

const OfferDocumentUpload = () => {
  const { token } = useParams<{ token: string }>();
  const [uploadLink, setUploadLink] = useState<OfferUploadLink | null>(null);
  const [existingDocuments, setExistingDocuments] = useState<OfferDocument[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setError("Token manquant dans l'URL");
        setLoading(false);
        return;
      }

      console.log('Vérification du token:', token);
      
      try {
        const link = await validateUploadToken(token);
        console.log('Résultat de la validation:', link);
        
        if (link) {
          setUploadLink(link);
          
          // Récupérer les documents existants pour cette offre
          const documents = await getOfferDocuments(link.offer_id);
          setExistingDocuments(documents);
          
          // Récupérer les informations de l'entreprise
          const company = await getCompanyByOfferId(link.offer_id);
          setCompanyInfo(company);
          
          console.log('🔍 DEBUG - Lien d\'upload validé:', link);
          console.log('🔍 DEBUG - Documents existants:', documents);
          console.log('🔍 DEBUG - Informations entreprise:', company);
          console.log('🔍 DEBUG - Company logo URL:', company?.logo_url);
          console.log('🔍 DEBUG - Company logo URL exists?', !!company?.logo_url);
        } else {
          setError("Lien invalide ou expiré");
          console.error('Token invalide ou expiré');
        }
      } catch (error) {
        console.error('Erreur lors de la validation du token:', error);
        setError("Erreur lors de la validation du lien");
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  // Calculer le statut de chaque document requis
  const getDocumentStatuses = (): DocumentStatus[] => {
    if (!uploadLink) return [];

    return uploadLink.requested_documents.map(docType => {
      const isCustom = docType.startsWith('custom:');
      const documentName = isCustom ? docType.replace('custom:', '') : DOCUMENT_TYPES[docType] || docType;
      
      // Chercher un document existant correspondant
      const existingDoc = existingDocuments.find(doc => doc.document_type === docType);
      
      if (!existingDoc) {
        return {
          docType,
          documentName,
          status: 'missing' as const
        };
      }

      return {
        docType,
        documentName,
        status: existingDoc.status as 'pending' | 'approved' | 'rejected',
        document: existingDoc,
        adminNotes: existingDoc.admin_notes || undefined
      };
    });
  };

  const documentStatuses = getDocumentStatuses();
  const allApproved = documentStatuses.every(doc => doc.status === 'approved');
  const hasRejected = documentStatuses.some(doc => doc.status === 'rejected');
  const hasPending = documentStatuses.some(doc => doc.status === 'pending');

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!token || !uploadLink) {
      toast.error("Token ou lien d'upload manquant");
      return;
    }

    // Validation du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

    if (file.size > maxSize) {
      toast.error("Le fichier est trop volumineux (max 10MB)");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non autorisé (PDF, JPG, PNG uniquement)");
      return;
    }

    setUploading(documentType);

    try {
      console.log('Début de l\'upload:', { 
        documentType, 
        fileName: file.name, 
        size: file.size,
        type: file.type,
        offerId: uploadLink.offer_id
      });
      
      const success = await uploadDocument(token, documentType, file, "");
      
      if (success) {
        // Refresh existing documents to get updated status
        const updatedDocuments = await getOfferDocuments(uploadLink.offer_id);
        setExistingDocuments(updatedDocuments);
        setUploadedDocs(prev => new Set([...prev, documentType]));
        toast.success("Document uploadé avec succès");
        console.log('Upload réussi pour:', documentType);
      } else {
        toast.error("Erreur lors de l'upload du document");
        console.error('Échec de l\'upload pour:', documentType);
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleCompleteUpload = async () => {
    if (!token) return;
    
    await markLinkAsUsed(token);
    toast.success("Tous vos documents ont été envoyés avec succès !");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !uploadLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Lien invalide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Ce lien d'upload est invalide ou a expiré."}</p>
            {token && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                <strong>Token:</strong> {token}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si tous les documents sont approuvés, afficher un message de succès
  if (allApproved && documentStatuses.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-6 w-6" />
                Documents validés
              </CardTitle>
              <CardDescription>
                Tous vos documents ont été approuvés avec succès.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Félicitations ! Tous les documents requis ont été téléchargés et validés par notre équipe.
                  Votre dossier de financement est complet.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Récapitulatif des documents validés :</h3>
                {documentStatuses.map((docStatus) => (
                  <div key={docStatus.docType} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">{docStatus.documentName}</span>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Approuvé
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Prochaines étapes :</strong> Notre équipe va maintenant traiter votre demande de financement. 
                  Vous recevrez une notification par email dès que votre dossier aura été examiné.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-6 w-6" />
              Upload de documents administratifs
            </CardTitle>
            <CardDescription>
              {hasPending && !hasRejected
                ? "Vos documents sont en cours d'examen par notre équipe."
                : hasRejected
                ? "Certains documents ont été rejetés et doivent être re-téléchargés."
                : "Veuillez uploader les documents demandés pour votre dossier de financement."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadLink.custom_message && (
              <Alert className="mb-6">
                <AlertDescription>{uploadLink.custom_message}</AlertDescription>
              </Alert>
            )}

            {hasPending && !hasRejected && (
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Vos documents sont en cours d'examen. Vous recevrez une notification par email une fois la validation terminée.
                </AlertDescription>
              </Alert>
            )}

            {hasRejected && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Certains documents ont été rejetés. Veuillez les re-télécharger en tenant compte des commentaires.
                </AlertDescription>
              </Alert>
            )}


            <div className="space-y-6">
              {documentStatuses.map((docStatus) => {
                const isUploading = uploading === docStatus.docType;
                const canUpload = docStatus.status === 'missing' || docStatus.status === 'rejected';

                const getStatusBadge = () => {
                  switch (docStatus.status) {
                    case 'approved':
                      return (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Approuvé
                        </Badge>
                      );
                    case 'pending':
                      return (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <Clock className="mr-1 h-3 w-3" />
                          En attente
                        </Badge>
                      );
                    case 'rejected':
                      return (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <XCircle className="mr-1 h-3 w-3" />
                          Rejeté
                        </Badge>
                      );
                    default:
                      return null;
                  }
                };

                const getStatusContent = () => {
                  switch (docStatus.status) {
                    case 'approved':
                      return (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center text-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <span className="text-sm">Document validé avec succès</span>
                          </div>
                          {docStatus.document && (
                            <p className="text-xs text-green-600 mt-1">
                              Téléchargé le {new Date(docStatus.document.uploaded_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      );
                    case 'pending':
                      return (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center text-orange-700">
                            <Clock className="mr-2 h-4 w-4" />
                            <span className="text-sm">Document en cours d'examen</span>
                          </div>
                          {docStatus.document && (
                            <p className="text-xs text-orange-600 mt-1">
                              Téléchargé le {new Date(docStatus.document.uploaded_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      );
                    case 'rejected':
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center text-red-700">
                            <XCircle className="mr-2 h-4 w-4" />
                            <span className="text-sm">Document rejeté - Veuillez re-télécharger</span>
                          </div>
                          {docStatus.adminNotes && (
                            <p className="text-xs text-red-600 mt-1">
                              <strong>Commentaire :</strong> {docStatus.adminNotes}
                            </p>
                          )}
                        </div>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <div key={docStatus.docType} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FileText className="mr-2 h-5 w-5 text-gray-500" />
                        <span className="font-medium">{docStatus.documentName}</span>
                      </div>
                      {getStatusBadge()}
                    </div>

                    {getStatusContent()}

                    {canUpload && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mt-3">
                        <input
                          type="file"
                          id={`file-${docStatus.docType}`}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(docStatus.docType, file);
                            }
                          }}
                          disabled={isUploading}
                        />
                        <label 
                          htmlFor={`file-${docStatus.docType}`}
                          className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
                        >
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">
                            {isUploading ? "Upload en cours..." : 
                             docStatus.status === 'rejected' ? "Cliquez pour re-télécharger le document" :
                             "Cliquez pour sélectionner un fichier"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, JPG, PNG (max 10MB)
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Debug info en mode développement */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
                <strong>Debug Info:</strong>
                <pre>{JSON.stringify({ 
                  token, 
                  documentStatuses,
                  allApproved,
                  hasRejected,
                  hasPending,
                  uploadLink: uploadLink ? {
                    id: uploadLink.id,
                    offer_id: uploadLink.offer_id,
                    requested_documents: uploadLink.requested_documents,
                    expires_at: uploadLink.expires_at,
                    used_at: uploadLink.used_at
                  } : null 
                }, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OfferDocumentUpload;

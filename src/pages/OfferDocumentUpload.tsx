
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
  Download
} from "lucide-react";
import { toast } from "sonner";
import { 
  validateUploadToken, 
  uploadDocument, 
  DOCUMENT_TYPES,
  OfferUploadLink,
  markLinkAsUsed
} from "@/services/offers/offerDocuments";

const OfferDocumentUpload = () => {
  const { token } = useParams<{ token: string }>();
  const [uploadLink, setUploadLink] = useState<OfferUploadLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [clientEmail, setClientEmail] = useState("");
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
          console.log('Lien d\'upload validé:', link);
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
      
      const success = await uploadDocument(token, documentType, file, clientEmail);
      
      if (success) {
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

  const allDocsUploaded = uploadLink.requested_documents.every(doc => 
    uploadedDocs.has(doc) || uploadedDocs.has(`custom:${doc}`)
  );

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
              Veuillez uploader les documents demandés pour votre dossier de financement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadLink.custom_message && (
              <Alert className="mb-6">
                <AlertDescription>{uploadLink.custom_message}</AlertDescription>
              </Alert>
            )}

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Votre adresse email (optionnel)
              </label>
              <input
                id="email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="votre.email@exemple.com"
              />
            </div>

            <div className="space-y-6">
              {uploadLink.requested_documents.map((docType) => {
                const isCustom = docType.startsWith('custom:');
                const documentName = isCustom ? docType.replace('custom:', '') : DOCUMENT_TYPES[docType] || docType;
                const isUploaded = uploadedDocs.has(docType);
                const isUploading = uploading === docType;

                return (
                  <div key={docType} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FileText className="mr-2 h-5 w-5 text-gray-500" />
                        <span className="font-medium">{documentName}</span>
                      </div>
                      {isUploaded && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Uploadé
                        </Badge>
                      )}
                    </div>

                    {!isUploaded && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id={`file-${docType}`}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(docType, file);
                            }
                          }}
                          disabled={isUploading}
                        />
                        <label 
                          htmlFor={`file-${docType}`}
                          className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
                        >
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">
                            {isUploading ? "Upload en cours..." : "Cliquez pour sélectionner un fichier"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, JPG, PNG (max 10MB)
                          </p>
                        </label>
                      </div>
                    )}

                    {isUploaded && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center text-green-700">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <span className="text-sm">Document uploadé avec succès</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allDocsUploaded && (
              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-700">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    <span className="font-medium">Tous les documents ont été uploadés</span>
                  </div>
                  <Button onClick={handleCompleteUpload} className="bg-green-600 hover:bg-green-700">
                    Terminer l'envoi
                  </Button>
                </div>
              </div>
            )}

            {/* Debug info en mode développement */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
                <strong>Debug Info:</strong>
                <pre>{JSON.stringify({ 
                  token, 
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

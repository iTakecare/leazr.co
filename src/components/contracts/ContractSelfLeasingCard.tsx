import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, ExternalLink, Clock, CheckCircle, Loader2, Download, User, Globe, Calendar, RefreshCw } from "lucide-react";
import SendContractEmailModal from "@/components/offers/detail/SendContractEmailModal";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { generateAndUploadSignedContractPDF, downloadSignedContractPDF } from "@/services/signedContractPdfService";
import { buildPublicContractSignatureUrl } from "@/utils/contractUrls";

interface ContractSelfLeasingCardProps {
  contract: any;
  onContractUpdated?: () => void;
}

const ContractSelfLeasingCard: React.FC<ContractSelfLeasingCardProps> = ({
  contract,
  onContractUpdated
}) => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const [leaser, setLeaser] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [isSelfLeasing, setIsSelfLeasing] = useState<boolean>(false);

  useEffect(() => {
    if (contract?.id) {
      checkSelfLeasingAndFetchData();
    } else {
      setIsLoading(false);
    }
  }, [contract?.id]);

  const checkSelfLeasingAndFetchData = async () => {
    try {
      // Check if self-leasing via is_self_leasing flag
      if (contract?.is_self_leasing === true) {
        setIsSelfLeasing(true);
        await fetchData();
        return;
      }

      // Check if self-leasing via leaser_id
      if (contract?.leaser_id) {
        const { data: leaserData } = await supabase
          .from('leasers')
          .select('is_own_company')
          .eq('id', contract.leaser_id)
          .maybeSingle();
        
        if (leaserData?.is_own_company === true) {
          setIsSelfLeasing(true);
          await fetchData();
          return;
        }
      }

      // Check if self-leasing via leaser_name
      if (contract?.leaser_name) {
        const { data: leaserData } = await supabase
          .from('leasers')
          .select('id, is_own_company')
          .eq('name', contract.leaser_name)
          .maybeSingle();
        
        if (leaserData?.is_own_company === true) {
          setIsSelfLeasing(true);
          setLeaser(leaserData);
          await fetchData();
          return;
        }
      }

      // Not self-leasing
      setIsSelfLeasing(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking self-leasing status:', error);
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch company name
      if (contract?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', contract.company_id)
          .maybeSingle();
        setCompanyName(companyData?.name || 'iTakecare');
      }

      // Fetch leaser
      if (contract?.leaser_id) {
        const { data: leaserData } = await supabase
          .from('leasers')
          .select('*')
          .eq('id', contract.leaser_id)
          .maybeSingle();
        setLeaser(leaserData);
      }

      // Fetch offer for email modal
      if (contract?.offer_id) {
        const { data: offerData } = await supabase
          .from('offers')
          .select('*, clients(*)')
          .eq('id', contract.offer_id)
          .maybeSingle();
        setOffer(offerData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSelfLeasing) {
    return null;
  }

  const getStatusBadge = () => {
    switch (contract.signature_status) {
      case 'pending_signature':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            En attente signature
          </Badge>
        );
      case 'signed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Signé
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            Brouillon
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            {contract.signature_status || 'En attente'}
          </Badge>
        );
    }
  };

  const handleOpenContractLink = () => {
    if (contract?.contract_signature_token && companySlug) {
      const url = buildPublicContractSignatureUrl(companySlug, contract.contract_signature_token);
      window.open(url, '_blank');
    }
  };

  const handleDownloadSignedPDF = async () => {
    try {
      setIsLoading(true);
      // Toujours générer et télécharger le PDF avec @react-pdf/renderer
      // Ignore signed_contract_pdf_url qui peut contenir un ancien fichier HTML
      await downloadSignedContractPDF(contract.id);
      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erreur lors du téléchargement du PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAndUploadPDF = async () => {
    try {
      setIsLoading(true);
      await generateAndUploadSignedContractPDF(contract.id);
      toast.success("PDF généré et uploadé avec succès");
      onContractUpdated?.();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContractSent = () => {
    onContractUpdated?.();
  };

  const handleResendSignedContract = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('send-signed-contract-email', {
        body: { contractId: contract.id }
      });

      if (error) throw error;

      toast.success("Email envoyé avec succès");
      onContractUpdated?.();
    } catch (error: any) {
      console.error("Error sending signed contract email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setIsLoading(false);
    }
  };

  const formatSignatureDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Contrat de location
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Leasing en propre via {companyName}
          </p>

          {/* Signature Information */}
          {contract.signature_status === 'signed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-green-800">Informations de signature</p>
              
              {contract.contract_signer_name && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <User className="w-3.5 h-3.5" />
                  <span>Signataire : {contract.contract_signer_name}</span>
                </div>
              )}
              
              {contract.contract_signed_at && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date : {formatSignatureDate(contract.contract_signed_at)}</span>
                </div>
              )}
              
              {contract.contract_signer_ip && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Globe className="w-3.5 h-3.5" />
                  <span>IP : {contract.contract_signer_ip}</span>
                </div>
              )}
            </div>
          )}

          {contract.signature_status === 'signed' ? (
            <div className="space-y-2">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={handleDownloadSignedPDF}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Télécharger le contrat signé
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleResendSignedContract}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Renvoyer le contrat signé
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleOpenContractLink}
                disabled={!contract.contract_signature_token}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir le contrat en ligne
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => setShowEmailModal(true)}
                disabled={!offer}
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer au client
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {offer && (
        <SendContractEmailModal
          open={showEmailModal}
          onOpenChange={setShowEmailModal}
          offer={offer}
          leaser={leaser}
          existingContract={{
            id: contract.id,
            contract_signature_token: contract.contract_signature_token,
            contract_number: contract.contract_number
          }}
          onContractSent={handleContractSent}
        />
      )}
    </>
  );
};

export default ContractSelfLeasingCard;

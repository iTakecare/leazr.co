import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, ExternalLink, Clock, CheckCircle, Loader2 } from "lucide-react";
import SendContractEmailModal from "@/components/offers/detail/SendContractEmailModal";
import { supabase } from "@/integrations/supabase/client";

interface ContractSelfLeasingCardProps {
  contract: any;
  onContractUpdated?: () => void;
}

const ContractSelfLeasingCard: React.FC<ContractSelfLeasingCardProps> = ({
  contract,
  onContractUpdated
}) => {
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
    if (contract?.contract_signature_token) {
      const url = `${window.location.origin}/contract/${contract.contract_signature_token}/sign`;
      window.open(url, '_blank');
    }
  };

  const handleOpenSignedPDF = () => {
    if (contract?.signed_contract_pdf_url) {
      window.open(contract.signed_contract_pdf_url, '_blank');
    }
  };

  const handleContractSent = () => {
    onContractUpdated?.();
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

          {contract.signature_status === 'signed' && contract.signed_contract_pdf_url ? (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={handleOpenSignedPDF}
            >
              <FileText className="w-4 h-4 mr-2" />
              Voir le contrat signé
            </Button>
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
            contract_signature_token: contract.contract_signature_token
          }}
          onContractSent={handleContractSent}
        />
      )}
    </>
  );
};

export default ContractSelfLeasingCard;

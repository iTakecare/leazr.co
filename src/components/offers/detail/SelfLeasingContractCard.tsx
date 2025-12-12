import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, ExternalLink, Clock, CheckCircle, Loader2 } from "lucide-react";
import SendContractEmailModal from "./SendContractEmailModal";
import { supabase } from "@/integrations/supabase/client";

interface SelfLeasingContractCardProps {
  offer: any;
  leaser: any;
  onContractCreated?: () => void;
}

interface ContractStatus {
  id: string;
  signature_status: string | null;
  contract_signature_token: string | null;
  signed_contract_pdf_url: string | null;
}

const SelfLeasingContractCard: React.FC<SelfLeasingContractCardProps> = ({
  offer,
  leaser,
  onContractCreated
}) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [contractStatus, setContractStatus] = useState<ContractStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if leaser is own company
  const isOwnCompany = leaser?.is_own_company === true;

  useEffect(() => {
    if (isOwnCompany && offer?.id) {
      fetchContractStatus();
    } else {
      setIsLoading(false);
    }
  }, [offer?.id, isOwnCompany]);

  const fetchContractStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, signature_status, contract_signature_token, signed_contract_pdf_url')
        .eq('offer_id', offer.id)
        .eq('is_self_leasing', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setContractStatus(data);
    } catch (error) {
      console.error('Error fetching contract status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwnCompany) {
    return null;
  }

  const getStatusBadge = () => {
    if (!contractStatus) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700">
          <Clock className="w-3 h-3 mr-1" />
          Non généré
        </Badge>
      );
    }

    switch (contractStatus.signature_status) {
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
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            Brouillon
          </Badge>
        );
    }
  };

  const handleOpenContractLink = () => {
    if (contractStatus?.contract_signature_token) {
      const url = `${window.location.origin}/contract/${contractStatus.contract_signature_token}/sign`;
      window.open(url, '_blank');
    }
  };

  const handleOpenSignedPDF = () => {
    if (contractStatus?.signed_contract_pdf_url) {
      window.open(contractStatus.signed_contract_pdf_url, '_blank');
    }
  };

  const handleContractCreated = () => {
    fetchContractStatus();
    onContractCreated?.();
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
            Leasing en propre via {leaser?.name}
          </p>

          {contractStatus?.signature_status === 'signed' && contractStatus.signed_contract_pdf_url ? (
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
              {contractStatus?.signature_status === 'pending_signature' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleOpenContractLink}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir le contrat en ligne
                </Button>
              )}

              <Button
                variant={contractStatus ? "outline" : "default"}
                size="sm"
                className="w-full"
                onClick={() => setShowEmailModal(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                {contractStatus ? "Renvoyer le contrat" : "Envoyer le contrat"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <SendContractEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        offer={offer}
        leaser={leaser}
        existingContract={contractStatus}
        onContractSent={handleContractCreated}
      />
    </>
  );
};

export default SelfLeasingContractCard;

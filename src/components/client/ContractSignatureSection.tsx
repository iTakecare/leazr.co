import React from "react";
import { motion } from "framer-motion";
import { FileSignature, CheckCircle, Clock, Eye, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContractSignatureSectionProps {
  offer: any;
  onViewContract?: () => void;
  onSignContract?: () => void;
}

export const ContractSignatureSection: React.FC<ContractSignatureSectionProps> = ({
  offer,
  onViewContract,
  onSignContract
}) => {
  const getSignatureStatus = () => {
    if (offer.signed_at) {
      return {
        status: 'signed',
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        badge: <Badge className="bg-green-500 hover:bg-green-600 text-white">Signé</Badge>,
        title: 'Contrat signé',
        description: 'Votre contrat a été signé électroniquement avec succès.',
        canView: true,
        canSign: false
      };
    }

    if (offer.workflow_status === 'contract_sent' || offer.status === 'sent') {
      return {
        status: 'ready_to_sign',
        icon: <FileSignature className="h-5 w-5 text-blue-500" />,
        badge: <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50/80">Prêt à signer</Badge>,
        title: 'Signature requise',
        description: 'Votre contrat est prêt et attend votre signature électronique.',
        canView: true,
        canSign: true
      };
    }

    return {
      status: 'pending',
      icon: <Clock className="h-5 w-5 text-orange-500" />,
      badge: <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50/80">En préparation</Badge>,
      title: 'Contrat en préparation',
      description: 'Votre contrat est en cours de préparation par notre équipe.',
      canView: false,
      canSign: false
    };
  };

  const signatureInfo = getSignatureStatus();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          Signature du contrat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {signatureInfo.icon}
              <div>
                <h3 className="font-semibold text-foreground">{signatureInfo.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {signatureInfo.description}
                </p>
              </div>
            </div>
            {signatureInfo.badge}
          </div>

          {/* Signature Details */}
          {offer.signed_at && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Contrat signé avec succès</p>
                  <p className="text-sm text-green-700">
                    Signé le {formatDate(offer.signed_at)}
                  </p>
                </div>
              </div>

              {offer.signer_name && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Signataire:</span>
                    <span className="font-medium text-green-900">{offer.signer_name}</span>
                  </div>
                  {offer.signer_ip && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Adresse IP:</span>
                      <span className="font-mono text-xs text-green-800">{offer.signer_ip}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {signatureInfo.canView && (
              <Button
                variant="outline"
                onClick={onViewContract}
                className="flex-1 gap-2"
              >
                <Eye className="h-4 w-4" />
                Consulter le contrat
              </Button>
            )}

            {signatureInfo.canSign && (
              <Button
                onClick={onSignContract}
                className="flex-1 gap-2"
              >
                <FileSignature className="h-4 w-4" />
                Signer le contrat
              </Button>
            )}

            {offer.signed_at && (
              <Button
                variant="outline"
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger le PDF
              </Button>
            )}
          </div>

          {/* Help Text */}
          {signatureInfo.status === 'ready_to_sign' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <p className="text-sm text-blue-800 mb-2">
                <strong>Information importante:</strong>
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• La signature électronique a la même valeur juridique qu'une signature manuscrite</li>
                <li>• Vous recevrez une copie du contrat signé par email</li>
                <li>• Le processus de signature est sécurisé et traçable</li>
              </ul>
            </motion.div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
};
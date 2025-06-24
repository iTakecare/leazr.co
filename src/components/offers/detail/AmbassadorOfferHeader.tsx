
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";

interface OfferHeaderProps {
  offer: any;
  onBack: () => void;
  onRefresh: () => void;
}

const AmbassadorOfferHeader: React.FC<OfferHeaderProps> = ({
  offer,
  onBack,
  onRefresh
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                Offre pour {offer.client_name}
                <OfferStatusBadge status={offer.workflow_status} />
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                Créée le {format(new Date(offer.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
};

export default AmbassadorOfferHeader;

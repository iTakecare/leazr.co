import React from "react";
import { User, Building, Mail, Phone, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MobileClientSummaryCardProps {
  clientName: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  onCall?: () => void;
  onEmail?: () => void;
  onClick?: () => void;
}

const MobileClientSummaryCard: React.FC<MobileClientSummaryCardProps> = ({
  clientName,
  clientCompany,
  clientEmail,
  clientPhone,
  onCall,
  onEmail,
  onClick,
}) => {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Nom client */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-semibold text-sm truncate">{clientName}</span>
            </div>

            {/* Entreprise */}
            {clientCompany && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {clientCompany}
                </span>
              </div>
            )}

            {/* Email */}
            {clientEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {clientEmail}
                </span>
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div className="flex gap-1 ml-2 flex-shrink-0">
            {clientPhone && onCall && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={(e) => {
                  e.stopPropagation();
                  onCall();
                }}
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}
            {clientEmail && onEmail && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={(e) => {
                  e.stopPropagation();
                  onEmail();
                }}
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Lien vers la fiche client */}
        {onClick && (
          <Button
            variant="ghost"
            className="w-full mt-3 h-8 text-xs justify-between"
            onClick={onClick}
          >
            Voir la fiche client
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileClientSummaryCard;

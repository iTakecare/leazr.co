import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Building2,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  Tag,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KYC_SCORE_COLORS,
  KYC_SCORE_LABELS,
  KycScoreLetter,
  computeAgeMonths,
} from "@/services/clients/clientKycScore";

interface ClientCompanyOverviewProps {
  client: any;
  /** Appelé quand l'utilisateur clique sur "Faire le KYC" — l'appelant doit basculer sur l'onglet KYC. */
  onGoToKyc?: () => void;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  societe: "Société",
  independant: "Indépendant",
  asbl: "ASBL",
  autre: "Autre",
};

export const ClientCompanyOverview: React.FC<ClientCompanyOverviewProps> = ({
  client,
  onGoToKyc,
}) => {
  const score = client?.kyc_score as KycScoreLetter | null | undefined;
  const reasons = (client?.kyc_score_reasons as string[] | null) ?? [];
  const ageMonths = computeAgeMonths(client?.company_creation_date ?? null);
  const colors = score ? KYC_SCORE_COLORS[score] : null;

  const hasAnyKycData =
    !!score ||
    !!client?.entity_type ||
    !!client?.legal_form ||
    !!client?.company_creation_date ||
    !!client?.business_sector;

  // CAS 1 : aucun KYC — placeholder + CTA
  if (!hasAnyKycData) {
    return (
      <Card className="shadow-md border-2 border-dashed border-slate-300 bg-slate-50/50">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-slate-200">
                <ShieldAlert className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  KYC société non réalisé
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                  Lance un lookup automatique BCE/SIRENE ou uploade un rapport pour récupérer la
                  forme juridique, la date de création, le secteur et calculer le score interne du
                  client.
                </p>
              </div>
            </div>
            {onGoToKyc && (
              <Button onClick={onGoToKyc} size="sm" variant="default">
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Faire le KYC
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // CAS 2 : KYC fait — bandeau riche
  return (
    <Card
      className={cn(
        "shadow-md border-2",
        colors ? colors.border : "border-slate-200",
      )}
    >
      <CardContent className={cn("pt-5 pb-5", colors ? colors.bg : "bg-slate-50/30")}>
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Score badge en GROS à gauche */}
          {score && colors ? (
            <div className="flex-shrink-0 flex items-center gap-3">
              <div
                className={cn(
                  "rounded-xl border-2 w-24 h-24 flex flex-col items-center justify-center bg-white",
                  colors.border,
                )}
              >
                <div className={cn("text-5xl font-extrabold leading-none", colors.text)}>
                  {score}
                </div>
                <div
                  className={cn("text-[10px] font-semibold uppercase mt-1", colors.text)}
                >
                  Score KYC
                </div>
              </div>
              <div className="hidden lg:block">
                <div className={cn("text-base font-bold", colors.text)}>
                  {KYC_SCORE_LABELS[score]}
                </div>
                {reasons.length > 0 && (
                  <ul
                    className={cn(
                      "text-xs mt-1 list-disc pl-4 space-y-0.5 max-w-xs",
                      colors.text,
                    )}
                  >
                    {reasons.slice(0, 3).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 rounded-xl border-2 border-slate-300 bg-white w-24 h-24 flex flex-col items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-slate-400" />
              <div className="text-[10px] font-semibold uppercase text-slate-400 mt-1">
                Score N/A
              </div>
            </div>
          )}

          {/* Infos société à droite */}
          <div className="flex-1 min-w-0 w-full">
            {/* Score label sur petit écran */}
            {score && colors && (
              <div className="lg:hidden mb-3">
                <div className={cn("text-base font-bold", colors.text)}>
                  {KYC_SCORE_LABELS[score]}
                </div>
                {reasons.length > 0 && (
                  <ul
                    className={cn(
                      "text-xs mt-1 list-disc pl-4 space-y-0.5",
                      colors.text,
                    )}
                  >
                    {reasons.slice(0, 3).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <OverviewField
                icon={Tag}
                label="Type"
                value={
                  client.entity_type
                    ? ENTITY_TYPE_LABELS[client.entity_type] ?? client.entity_type
                    : null
                }
              />
              <OverviewField
                icon={Building2}
                label="Forme juridique"
                value={client.legal_form}
                highlight
              />
              <OverviewField
                icon={CalendarClock}
                label="Date de création"
                value={
                  client.company_creation_date
                    ? `${new Date(client.company_creation_date).toLocaleDateString("fr-BE")}${
                        ageMonths !== null ? ` · ${ageMonths} mois` : ""
                      }`
                    : null
                }
              />
              <OverviewField
                icon={FileText}
                label="Secteur"
                value={client.business_sector}
                truncate
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {client.kyc_validated_at && (
                <Badge variant="outline" className="text-[10px] py-0 h-5 bg-white">
                  KYC validé le{" "}
                  {new Date(client.kyc_validated_at).toLocaleDateString("fr-BE")}
                </Badge>
              )}
              {onGoToKyc && (
                <Button
                  onClick={onGoToKyc}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                >
                  Détails KYC
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const OverviewField: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
  truncate?: boolean;
}> = ({ icon: Icon, label, value, highlight, truncate }) => (
  <div className="rounded-md bg-white/70 border border-white px-3 py-2">
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500 mb-1">
      <Icon className="h-3 w-3" />
      {label}
    </div>
    <div
      className={cn(
        "text-sm",
        value
          ? highlight
            ? "font-semibold text-slate-900"
            : "text-slate-700"
          : "italic text-slate-400",
        truncate && "truncate",
      )}
      title={truncate && value ? value : undefined}
    >
      {value || "Non renseigné"}
    </div>
  </div>
);

export default ClientCompanyOverview;

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  Voicemail,
  Calendar,
  FileText,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { format, parseISO, isToday, isPast, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DashboardCallback } from "@/services/callLogService";

interface ClientsToContactCardProps {
  callbacks: DashboardCallback[];
  isLoading: boolean;
  compact?: boolean;
}

export const ClientsToContactCard: React.FC<ClientsToContactCardProps> = ({
  callbacks,
  isLoading,
  compact = false,
}) => {
  const location = useLocation();
  const companySlug = location.pathname.split("/")[1];
  const [showAll, setShowAll] = useState(false);

  const today = new Date();

  const overdue = callbacks.filter(
    (c) => isPast(parseISO(c.callback_date)) && !isToday(parseISO(c.callback_date))
  );
  const todayItems = callbacks.filter((c) => isToday(parseISO(c.callback_date)));
  const upcoming = callbacks.filter(
    (c) => !isPast(parseISO(c.callback_date)) && !isToday(parseISO(c.callback_date))
  );

  const urgentCount = overdue.length + todayItems.length;
  const totalCount = callbacks.length;

  const visibleCallbacks =
    showAll || compact ? callbacks : callbacks.slice(0, 8);

  const borderColor =
    overdue.length > 0
      ? "border-red-200"
      : todayItems.length > 0
      ? "border-orange-200"
      : "border-sky-200";

  const statusLabel = (status: "voicemail" | "no_answer") =>
    status === "voicemail" ? "Messagerie" : "Pas répondu";

  const statusIcon = (status: "voicemail" | "no_answer") =>
    status === "voicemail" ? (
      <Voicemail className="h-3 w-3" />
    ) : (
      <PhoneMissed className="h-3 w-3" />
    );

  // Urgence basée sur callback_date (pour la couleur de la ligne)
  const getUrgencyConfig = (callbackDate: string) => {
    const date = parseISO(callbackDate);
    if (isPast(date) && !isToday(date)) {
      return {
        rowBg: "bg-red-50 hover:bg-red-100",
        borderLeft: "border-l-red-400",
        icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
        urgencyBadge: <span className="text-xs text-red-600 font-medium shrink-0">⚠ En retard</span>,
      };
    }
    if (isToday(date)) {
      return {
        rowBg: "bg-orange-50 hover:bg-orange-100",
        borderLeft: "border-l-orange-400",
        icon: <Clock className="h-3.5 w-3.5 text-orange-500" />,
        urgencyBadge: <span className="text-xs text-orange-600 font-medium shrink-0">À rappeler</span>,
      };
    }
    return {
      rowBg: "bg-slate-50 hover:bg-slate-100",
      borderLeft: "border-l-slate-300",
      icon: <Calendar className="h-3.5 w-3.5 text-slate-400" />,
      urgencyBadge: null,
    };
  };

  if (isLoading) {
    return (
      <Card className={cn("border-l-4", borderColor)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-slate-500" />
            Clients à contacter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4", borderColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-slate-600" />
            Clients à contacter
            {urgentCount > 0 && (
              <Badge
                className={cn(
                  "text-xs font-normal px-1.5 py-0",
                  overdue.length > 0
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-orange-100 text-orange-700 border-orange-200"
                )}
                variant="outline"
              >
                {urgentCount} urgent{urgentCount > 1 ? "s" : ""}
              </Badge>
            )}
            {totalCount > 0 && urgentCount === 0 && (
              <Badge variant="outline" className="text-xs font-normal px-1.5 py-0 bg-sky-50 text-sky-700 border-sky-200">
                {totalCount}
              </Badge>
            )}
          </CardTitle>

          {/* Résumé rapide */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {overdue.length > 0 && (
                <span className="text-red-600 font-medium">{overdue.length} en retard</span>
              )}
              {todayItems.length > 0 && (
                <span className="text-orange-600 font-medium">{todayItems.length} auj.</span>
              )}
              {upcoming.length > 0 && (
                <span className="text-slate-500">{upcoming.length} à venir</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
            <p className="text-sm text-muted-foreground">Aucun rappel en attente</p>
            <p className="text-xs text-muted-foreground">Beau travail !</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleCallbacks.map((cb) => {
              const urg = getUrgencyConfig(cb.callback_date);
              return (
                <Link
                  key={cb.id}
                  to={`/${companySlug}/admin/offers/${cb.offer_id}?tab=calls`}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-all group",
                    urg.rowBg,
                    urg.borderLeft
                  )}
                >
                  {/* Icône urgence */}
                  <div className="shrink-0 mt-0.5">{urg.icon}</div>

                  {/* Infos client */}
                  <div className="flex-1 min-w-0">
                    {/* Ligne 1 : nom + dossier + statut appel */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate leading-tight">
                        {cb.offers?.client_name}
                      </span>
                      {cb.offers?.dossier_number && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {cb.offers.dossier_number}
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs px-1.5 py-0 rounded-full shrink-0",
                          cb.last_call_status === "voicemail"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        )}
                      >
                        {statusIcon(cb.last_call_status)}
                        {statusLabel(cb.last_call_status)}
                      </span>
                    </div>

                    {/* Ligne 2 : date réelle de l'appel + auteur */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {format(parseISO(cb.called_at), "dd/MM/yyyy", { locale: fr })}
                      </span>
                      {cb.author_name && cb.author_name !== "Inconnu" && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          {cb.author_name}
                        </span>
                      )}
                      {urg.urgencyBadge}
                    </div>

                    {/* Ligne 3 : notes */}
                    <div className="mt-0.5 space-y-0.5">
                      {cb.latest_offer_note && (
                        <p className="text-xs text-slate-600 flex items-start gap-1 leading-snug">
                          <FileText className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" />
                          <span className="truncate italic">{cb.latest_offer_note.content}</span>
                        </p>
                      )}
                      {cb.call_notes && cb.call_notes !== cb.latest_offer_note?.content && (
                        <p className="text-xs text-slate-500 flex items-start gap-1 leading-snug">
                          <Phone className="h-3 w-3 shrink-0 mt-0.5 text-slate-300" />
                          <span className="truncate">{cb.call_notes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Flèche hover */}
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
                </Link>
              );
            })}

            {!compact && !showAll && callbacks.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
                onClick={() => setShowAll(true)}
              >
                Voir les {callbacks.length - 8} autres rappels
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientsToContactCard;

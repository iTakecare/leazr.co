import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneCall, Calendar, ExternalLink } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { format, parseISO, isToday, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PendingCallback } from "@/services/callLogService";

interface CallbacksWidgetProps {
  callbacks: PendingCallback[];
  isLoading: boolean;
}

export const CallbacksWidget: React.FC<CallbacksWidgetProps> = ({
  callbacks,
  isLoading,
}) => {
  const location = useLocation();
  const companySlug = location.pathname.split("/")[1];

  const overdueCallbacks = callbacks.filter(
    (c) => isPast(parseISO(c.callback_date)) && !isToday(parseISO(c.callback_date))
  );
  const todayCallbacks = callbacks.filter((c) =>
    isToday(parseISO(c.callback_date))
  );

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-sky-400">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-500" />
            Rappels client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const borderColor =
    overdueCallbacks.length > 0
      ? "border-l-red-500"
      : todayCallbacks.length > 0
      ? "border-l-sky-500"
      : "border-l-sky-300";

  const badgeColor =
    overdueCallbacks.length > 0
      ? "bg-red-100 text-red-700"
      : "bg-sky-100 text-sky-700";

  return (
    <Card className={cn("border-l-4", borderColor)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Phone className="h-4 w-4 text-slate-500" />
          Rappels client
          {callbacks.length > 0 && (
            <span
              className={cn(
                "ml-auto text-xs font-normal px-2 py-0.5 rounded-full",
                badgeColor
              )}
            >
              {callbacks.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {callbacks.length === 0 ? (
          <div className="text-center py-4">
            <PhoneCall className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              ✓ Aucun rappel en attente
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {/* En retard */}
            {overdueCallbacks.length > 0 && (
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide px-1">
                En retard ({overdueCallbacks.length})
              </p>
            )}
            {callbacks.map((cb) => {
              const callbackDate = parseISO(cb.callback_date);
              const isOverdue = isPast(callbackDate) && !isToday(callbackDate);
              const isCallbackToday = isToday(callbackDate);

              return (
                <Link
                  key={cb.id}
                  to={`/${companySlug}/admin/offers/${cb.offer_id}`}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg border-l-2 transition-colors group",
                    isOverdue
                      ? "bg-red-50 border-l-red-400 hover:bg-red-100"
                      : isCallbackToday
                      ? "bg-sky-50 border-l-sky-400 hover:bg-sky-100"
                      : "bg-slate-50 border-l-slate-300 hover:bg-slate-100"
                  )}
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-full shrink-0",
                      isOverdue
                        ? "bg-red-100 text-red-600"
                        : isCallbackToday
                        ? "bg-sky-100 text-sky-600"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {cb.offers?.client_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">
                        {cb.offers?.dossier_number}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span
                        className={cn(
                          "text-xs font-medium flex items-center gap-0.5",
                          isOverdue
                            ? "text-red-600"
                            : isCallbackToday
                            ? "text-sky-600"
                            : "text-slate-500"
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {isOverdue
                          ? `Retard — ${format(callbackDate, "dd/MM", {
                              locale: fr,
                            })}`
                          : isCallbackToday
                          ? "Aujourd'hui"
                          : format(callbackDate, "dd/MM", { locale: fr })}
                      </span>
                    </div>
                    {cb.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                        {cb.notes}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CallbacksWidget;


import React, { useState, useEffect } from "react";
import { getAmbassadorCommissionInfo, CommissionLevelInfo } from "@/utils/getAmbassadorCommissionInfo";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface AmbassadorCommissionDebugProps {
  ambassadorId: string;
}

const AmbassadorCommissionDebug: React.FC<AmbassadorCommissionDebugProps> = ({ ambassadorId }) => {
  const [commissionInfo, setCommissionInfo] = useState<CommissionLevelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommissionInfo = async () => {
      try {
        setLoading(true);
        const info = await getAmbassadorCommissionInfo(ambassadorId);
        setCommissionInfo(info);
        if (!info) {
          setError("Aucune information de commission trouvée");
        }
      } catch (err) {
        console.error("Erreur:", err);
        setError("Erreur lors de la récupération des informations de commission");
      } finally {
        setLoading(false);
      }
    };

    fetchCommissionInfo();
  }, [ambassadorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Chargement des informations de commission...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!commissionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucune information disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aucun barème de commission n'a été trouvé pour cet ambassadeur.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Barème de commissionnement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">
              {commissionInfo.name} {commissionInfo.is_default && "(Par défaut)"}
            </h3>
            <p className="text-sm text-muted-foreground">
              ID: {commissionInfo.id}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Taux de commission:</h4>
            {commissionInfo.rates.length === 0 ? (
              <p className="text-muted-foreground">Aucun taux défini pour ce barème</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Montant min</th>
                      <th className="px-4 py-2 text-left">Montant max</th>
                      <th className="px-4 py-2 text-left">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionInfo.rates.map((rate, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{formatCurrency(Number(rate.min_amount))}</td>
                        <td className="px-4 py-2">{formatCurrency(Number(rate.max_amount))}</td>
                        <td className="px-4 py-2 font-medium">{formatPercentage(Number(rate.rate))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AmbassadorCommissionDebug;

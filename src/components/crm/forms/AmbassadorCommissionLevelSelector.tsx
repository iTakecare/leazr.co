
import React, { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommissionLevels, CommissionLevel } from "@/services/commissionService";
import { BadgePercent, Loader2 } from "lucide-react";

interface AmbassadorCommissionLevelSelectorProps {
  control: any;
  currentLevelId?: string;
}

const AmbassadorCommissionLevelSelector = ({ 
  control, 
  currentLevelId 
}: AmbassadorCommissionLevelSelectorProps) => {
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCommissionLevels = async () => {
      try {
        const levels = await getCommissionLevels("ambassador");
        setCommissionLevels(levels);
      } catch (error) {
        console.error("Error loading commission levels:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCommissionLevels();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5" />
            Barème de commissionnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement des barèmes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgePercent className="h-5 w-5" />
          Barème de commissionnement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="commission_level_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sélectionner un barème</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un barème de commissionnement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {commissionLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      <div className="flex items-center gap-2">
                        {level.name}
                        {level.is_default && (
                          <Badge variant="outline" className="text-xs">
                            Par défaut
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default AmbassadorCommissionLevelSelector;

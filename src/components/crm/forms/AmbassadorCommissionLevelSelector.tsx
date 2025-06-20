
import React, { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCommissionLevels, CommissionLevel, getCommissionLevelWithRates } from "@/services/commissionService";
import { updateAmbassadorCommissionLevel } from "@/services/ambassadorService";
import { BadgePercent, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";

interface AmbassadorCommissionLevelSelectorProps {
  control: any;
  currentLevelId?: string;
}

const AmbassadorCommissionLevelSelector = ({ 
  control, 
  currentLevelId 
}: AmbassadorCommissionLevelSelectorProps) => {
  const { id: ambassadorId } = useParams<{ id: string }>();
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<CommissionLevel | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string>(currentLevelId || "");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadCommissionLevels = async () => {
      try {
        const levels = await getCommissionLevels("ambassador");
        setCommissionLevels(levels);
        
        if (currentLevelId) {
          const levelWithRates = await getCommissionLevelWithRates(currentLevelId);
          setSelectedLevel(levelWithRates);
          setSelectedLevelId(currentLevelId);
        }
      } catch (error) {
        console.error("Error loading commission levels:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCommissionLevels();
  }, [currentLevelId]);

  const handleLevelChange = async (levelId: string) => {
    if (!levelId) return;
    
    setSelectedLevelId(levelId);
    
    try {
      const levelWithRates = await getCommissionLevelWithRates(levelId);
      setSelectedLevel(levelWithRates);
    } catch (error) {
      console.error("Error loading commission level details:", error);
    }
  };

  const handleSave = async () => {
    if (!ambassadorId || !selectedLevelId) return;
    
    setUpdating(true);
    try {
      await updateAmbassadorCommissionLevel(ambassadorId, selectedLevelId);
      toast.success("Barème de commissionnement mis à jour avec succès");
    } catch (error) {
      console.error("Error updating commission level:", error);
      toast.error("Erreur lors de la mise à jour du barème");
    } finally {
      setUpdating(false);
    }
  };

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
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedLevelId} onValueChange={handleLevelChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choisir un barème de commissionnement" />
            </SelectTrigger>
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
          
          {selectedLevelId !== currentLevelId && (
            <Button 
              onClick={handleSave} 
              disabled={updating}
              size="sm"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Sauvegarder
                </>
              )}
            </Button>
          )}
        </div>

        {selectedLevel && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-medium">{selectedLevel.name}</h4>
              {selectedLevel.is_default && (
                <Badge variant="outline" className="text-xs">Par défaut</Badge>
              )}
            </div>
            
            {selectedLevel.rates && selectedLevel.rates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">Paliers de commission :</p>
                {selectedLevel.rates
                  .sort((a, b) => a.min_amount - b.min_amount)
                  .map((rate, index) => (
                    <div key={index} className="flex justify-between items-center py-1 px-2 bg-background rounded text-sm">
                      <span>
                        {Number(rate.min_amount).toLocaleString('fr-FR')}€ - {Number(rate.max_amount).toLocaleString('fr-FR')}€
                      </span>
                      <span className="font-medium text-green-600">{rate.rate}%</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorCommissionLevelSelector;

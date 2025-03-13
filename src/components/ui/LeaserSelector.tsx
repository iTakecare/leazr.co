
import React, { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Building2, Loader2 } from "lucide-react";
import { Leaser } from "@/types/equipment";
import { getLeasers } from "@/services/leaserService";
import { defaultLeasers } from "@/data/leasers";
import { toast } from "sonner";

interface LeaserSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (leaser: Leaser) => void;
  currentLeaserId?: string;
}

const LeaserSelector = ({ isOpen, onClose, onSelect, currentLeaserId }: LeaserSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [leasers, setLeasers] = useState<Leaser[]>(defaultLeasers);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Ne chargez les leasers que lorsque le sélecteur est ouvert
    if (isOpen) {
      fetchLeasers();
    }
  }, [isOpen]);
  
  const fetchLeasers = async () => {
    if (loading) return; // Évitez les appels multiples
    
    setLoading(true);
    try {
      const fetchedLeasers = await getLeasers();
      // Si aucun leaser n'est trouvé, utiliser les leasers par défaut
      if (fetchedLeasers && fetchedLeasers.length > 0) {
        setLeasers(fetchedLeasers);
      } else {
        setLeasers(defaultLeasers);
      }
    } catch (error) {
      console.error("Error fetching leasers:", error);
      toast.error("Impossible de charger les leasers, utilisation des valeurs par défaut");
      setLeasers(defaultLeasers);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredLeasers = leasers.filter(leaser => 
    leaser.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSelect = (leaser: Leaser) => {
    onSelect(leaser);
    onClose();
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sélection du leaser</SheetTitle>
          <SheetDescription>
            Choisissez un organisme de financement
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Input
            placeholder="Rechercher un leaser..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredLeasers.map((leaser) => (
                <div
                  key={leaser.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:border-primary ${
                    currentLeaserId === leaser.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => handleSelect(leaser)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {leaser.logo_url ? (
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center overflow-hidden">
                          <img 
                            src={leaser.logo_url} 
                            alt={leaser.name} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                      <h3 className="font-medium">{leaser.name}</h3>
                    </div>
                    {currentLeaserId === leaser.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="mt-2 pl-8">
                    <p className="text-sm text-muted-foreground">
                      {leaser.ranges.length} barème(s) disponible(s)
                    </p>
                  </div>
                </div>
              ))}
              
              {filteredLeasers.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Aucun leaser trouvé</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeaserSelector;

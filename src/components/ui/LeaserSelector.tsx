
import React, { useState, useEffect, useCallback } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Leaser } from "@/types/equipment";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Loader2, Search, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getLeasers } from "@/services/leaserService";
import { toast } from "sonner";

interface LeaserSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeaser: Leaser | null;
  onSelect: (leaser: Leaser) => void;
}

const LeaserSelector: React.FC<LeaserSelectorProps> = ({
  isOpen,
  onClose,
  selectedLeaser,
  onSelect,
}) => {
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchLeasers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedLeasers = await getLeasers();
      setLeasers(fetchedLeasers);
    } catch (error) {
      console.error("Error fetching leasers:", error);
      setError("Failed to load leasers");
      toast.error("Impossible de charger les leasers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLeasers();
    }
  }, [fetchLeasers, isOpen]);

  const filteredLeasers = leasers.filter((leaser) =>
    leaser.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (leaser: Leaser) => {
    onSelect(leaser);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sélectionner un leaser</SheetTitle>
          <SheetDescription>
            Choisissez l'organisme de financement pour cette offre.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un leaser..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeasers.length > 0 ? (
            <div className="space-y-1">
              {filteredLeasers.map((leaser) => (
                <div
                  key={leaser.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedLeaser?.id === leaser.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => handleSelect(leaser)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-9 w-9 rounded-md">
                      {leaser.logo_url ? (
                        <AvatarImage 
                          src={leaser.logo_url} 
                          alt={leaser.name}
                          className="object-contain p-2 bg-white"
                        />
                      ) : null}
                      <AvatarFallback className="rounded-md bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{leaser.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {leaser.ranges.length} tranches
                      </div>
                    </div>
                    {leaser.is_default && (
                      <Badge variant="outline" className="ml-auto">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                        Par défaut
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun leaser trouvé.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeaserSelector;

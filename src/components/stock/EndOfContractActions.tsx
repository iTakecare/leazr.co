import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  StockItem,
  StockCondition,
  CONDITION_CONFIG,
  recoverToStock,
  sellItem,
  scrapItem,
  racheterItem,
} from "@/services/stockService";
import { useAuth } from "@/context/AuthContext";
import { RotateCcw, ShoppingBag, Trash2, Loader2, Euro } from "lucide-react";

interface EndOfContractActionsProps {
  item: StockItem;
  companyId: string;
  contractId?: string | null;
  onSuccess: () => void;
}

const EndOfContractActions: React.FC<EndOfContractActionsProps> = ({
  item,
  companyId,
  contractId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [condition, setCondition] = useState<StockCondition>("good");
  const [loading, setLoading] = useState<string | null>(null);

  const handleRecover = async () => {
    if (!user) return;
    setLoading("recover");
    try {
      await recoverToStock(companyId, item.id, condition, user.id, contractId);
      toast({
        title: "Matériel récupéré",
        description: `${item.title} remis en stock (${CONDITION_CONFIG[condition].label})`,
      });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleRachat = async () => {
    if (!user) return;
    setLoading("rachat");
    try {
      await racheterItem(companyId, item.id, user.id, contractId);
      toast({
        title: "Rachat client enregistré",
        description: `${item.title} marqué comme racheté par le client`,
      });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSell = async () => {
    if (!user) return;
    setLoading("sell");
    try {
      await sellItem(companyId, item.id, user.id, contractId);
      toast({
        title: "Matériel vendu",
        description: `${item.title} marqué comme vendu`,
      });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleScrap = async () => {
    if (!user) return;
    setLoading("scrap");
    try {
      await scrapItem(companyId, item.id, user.id, contractId);
      toast({
        title: "Matériel mis au rebut",
        description: `${item.title} marqué comme rebut`,
      });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Retour en stock */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title="Retourner en stock"
            disabled={!!loading}
            className="h-8 w-8 p-0"
          >
            {loading === "recover" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retour en stock</AlertDialogTitle>
            <AlertDialogDescription>
              "{item.title}" sera dissocié du contrat et remis en stock. Choisissez son état :
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={condition} onValueChange={(v) => setCondition(v as StockCondition)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecover}>Confirmer le retour</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rachat client */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title="Rachat par le client"
            disabled={!!loading}
            className="h-8 w-8 p-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {loading === "rachat" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Euro className="h-3.5 w-3.5" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rachat client</AlertDialogTitle>
            <AlertDialogDescription>
              Le client rachète "{item.title}" à la fin du leasing. L'article sera marqué comme
              vendu (rachat client payé).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRachat}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirmer le rachat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rebut */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title="Mettre au rebut"
            disabled={!!loading}
            className="h-8 w-8 p-0"
          >
            {loading === "scrap" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre au rebut</AlertDialogTitle>
            <AlertDialogDescription>
              "{item.title}" sera marqué comme mis au rebut. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleScrap}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EndOfContractActions;

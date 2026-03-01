import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { StockItem, StockCondition, CONDITION_CONFIG, recoverToStock, sellItem, scrapItem } from "@/services/stockService";
import { useAuth } from "@/context/AuthContext";
import { RotateCcw, ShoppingCart, Trash2, Loader2 } from "lucide-react";

interface EndOfContractActionsProps {
  item: StockItem;
  companyId: string;
  onSuccess: () => void;
}

const EndOfContractActions: React.FC<EndOfContractActionsProps> = ({ item, companyId, onSuccess }) => {
  const { user } = useAuth();
  const [condition, setCondition] = useState<StockCondition>('good');
  const [loading, setLoading] = useState<string | null>(null);

  const handleRecover = async () => {
    if (!user) return;
    setLoading('recover');
    try {
      await recoverToStock(companyId, item.id, condition, user.id);
      toast({ title: "Matériel récupéré", description: `${item.title} remis en stock (${CONDITION_CONFIG[condition].label})` });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSell = async () => {
    if (!user) return;
    setLoading('sell');
    try {
      await sellItem(companyId, item.id, user.id);
      toast({ title: "Matériel vendu", description: `${item.title} marqué comme vendu` });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleScrap = async () => {
    if (!user) return;
    setLoading('scrap');
    try {
      await scrapItem(companyId, item.id, user.id);
      toast({ title: "Matériel mis au rebut", description: `${item.title} marqué comme rebut` });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Recover to stock */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" title="Remettre en stock" disabled={!!loading}>
            {loading === 'recover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre en stock</AlertDialogTitle>
            <AlertDialogDescription>
              L'article "{item.title}" sera dissocié du contrat et remis en stock. Choisissez son état :
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={condition} onValueChange={v => setCondition(v as StockCondition)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecover}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sell */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" title="Vendre au client" disabled={!!loading}>
            {loading === 'sell' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vendre au client</AlertDialogTitle>
            <AlertDialogDescription>
              L'article "{item.title}" sera marqué comme vendu au client. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSell}>Confirmer la vente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scrap */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" title="Mettre au rebut" disabled={!!loading}>
            {loading === 'scrap' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre au rebut</AlertDialogTitle>
            <AlertDialogDescription>
              L'article "{item.title}" sera marqué comme mis au rebut. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleScrap} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EndOfContractActions;

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Warehouse, ArrowRightLeft, Package, Loader2 } from "lucide-react";
import { StockItem, fetchStockItemsByContract, STOCK_STATUS_CONFIG, CONDITION_CONFIG } from "@/services/stockService";
import SwapDialog from "./SwapDialog";
import EndOfContractActions from "./EndOfContractActions";

interface ContractStockManagerProps {
  contractId: string;
  companyId: string;
  onUpdate: () => void;
}

const ContractStockManager: React.FC<ContractStockManagerProps> = ({ contractId, companyId, onUpdate }) => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapItem, setSwapItem] = useState<StockItem | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await fetchStockItemsByContract(contractId);
      setItems(data);
    } catch (e) {
      console.error("Erreur chargement stock contrat:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [contractId]);

  const handleRefresh = () => {
    loadItems();
    onUpdate();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Warehouse className="h-5 w-5" />
            Gestion du stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Aucun article de stock lié à ce contrat</p>
              <p className="text-xs mt-1">Les articles apparaîtront ici après ajout depuis les commandes fournisseurs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const statusCfg = STOCK_STATUS_CONFIG[item.status];
                const condCfg = CONDITION_CONFIG[item.condition];
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.serial_number && (
                          <span className="text-xs text-muted-foreground">S/N: {item.serial_number}</span>
                        )}
                        <Badge variant="outline" className={`text-xs ${statusCfg?.bgColor || ''} ${statusCfg?.color || ''}`}>
                          {statusCfg?.label || item.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {condCfg?.label || item.condition}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {item.status === 'assigned' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setSwapItem(item)} title="Swap">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                          <EndOfContractActions item={item} companyId={companyId} onSuccess={handleRefresh} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {swapItem && (
        <SwapDialog
          open={!!swapItem}
          onOpenChange={open => !open && setSwapItem(null)}
          currentItem={swapItem}
          contractId={contractId}
          companyId={companyId}
          onSuccess={handleRefresh}
        />
      )}
    </>
  );
};

export default ContractStockManager;

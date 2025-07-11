import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NewEquipmentSectionProps {
  offer: {
    id: string;
  };
}

const NewEquipmentSection: React.FC<NewEquipmentSectionProps> = ({ offer }) => {
  const { equipment, loading, error } = useOfferEquipment(offer.id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatAttributes = (attributes: Array<{ key: string; value: string }> = []) => {
    if (!attributes.length) return "";
    return attributes.map(attr => `${attr.key}: ${attr.value}`).join(", ");
  };

  const calculateTotals = () => {
    return equipment.reduce(
      (acc, item) => {
        const totalPrice = item.purchase_price * item.quantity;
        const totalMargin = item.margin * item.quantity;
        return {
          totalPrice: acc.totalPrice + totalPrice,
          totalMargin: acc.totalMargin + totalMargin,
        };
      },
      { totalPrice: 0, totalMargin: 0 }
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement des équipements...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Erreur lors du chargement des équipements
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!equipment.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucun équipement trouvé
          </div>
        </CardContent>
      </Card>
    );
  }

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Équipements
          <Badge variant="secondary">{equipment.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[300px]">Description</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Prix total</TableHead>
                <TableHead className="text-right">Marge totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => {
                const totalPrice = item.purchase_price * item.quantity;
                const totalMargin = item.margin * item.quantity;
                const attributes = formatAttributes(item.attributes);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.title}</div>
                        {attributes && (
                          <div className="text-sm text-muted-foreground">
                            {attributes}
                          </div>
                        )}
                        {item.serial_number && (
                          <div className="text-xs text-muted-foreground">
                            S/N: {item.serial_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(item.purchase_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatPrice(totalPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-primary">
                      {formatPrice(totalMargin)}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Ligne de totaux */}
              <TableRow className="border-t-2 bg-muted/50">
                <TableCell colSpan={3} className="font-bold text-right">
                  TOTAUX GÉNÉRAUX
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-lg">
                  {formatPrice(totals.totalPrice)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-lg text-primary">
                  {formatPrice(totals.totalMargin)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewEquipmentSection;
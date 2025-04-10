
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Tag, BarChart3 } from "lucide-react";

interface EquipmentItem {
  id?: string;
  title: string;
  purchasePrice?: number;
  quantity: number;
  margin?: number;
  monthlyPayment: number;
  serialNumber?: string;
}

interface EquipmentDetailTableProps {
  equipment: EquipmentItem[];
  totalMonthly: number;
  totalMargin: number;
}

const EquipmentDetailTable: React.FC<EquipmentDetailTableProps> = ({ 
  equipment, 
  totalMonthly,
  totalMargin
}) => {
  // Calculer le total
  const totalQuantity = equipment.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center">
          <Package className="h-5 w-5 mr-2 text-blue-600" />
          Détail de l'équipement
        </CardTitle>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {equipment.length} article{equipment.length > 1 ? 's' : ''}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead>Désignation</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
                <TableHead className="text-right">Prix mensuel</TableHead>
                <TableHead className="text-right">Total mensuel</TableHead>
                <TableHead className="text-center">Numéro de série</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.monthlyPayment)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.monthlyPayment * item.quantity)}</TableCell>
                  <TableCell className="text-center">
                    {item.serialNumber ? (
                      <div className="flex items-center justify-center">
                        <Tag className="h-3.5 w-3.5 mr-1 text-gray-400" />
                        <span className="font-mono text-xs">{item.serialNumber}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non disponible</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-md p-3 border border-blue-100 flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-1">Quantité totale</div>
              <div className="font-bold text-lg">{totalQuantity} articles</div>
            </div>
            
            <div className="bg-white/80 rounded-md p-3 border border-blue-100 flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-1">Mensualité totale</div>
              <div className="font-bold text-lg text-blue-700">{formatCurrency(totalMonthly)}</div>
            </div>
            
            <div className="bg-white/80 rounded-md p-3 border border-green-100 flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <BarChart3 className="h-3.5 w-3.5 mr-1 text-green-500" />
                Marge générée
              </div>
              <div className="font-bold text-lg text-green-600">{formatCurrency(totalMargin)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentDetailTable;

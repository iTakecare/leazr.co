
import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { 
  Card, 
  CardHeader,
  CardTitle, 
  CardContent,
  CardDescription
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface EquipmentDisplayProps {
  equipmentDisplay: string;
  monthlyPayment: number;
  remarks?: string;
}

const EquipmentDisplay: React.FC<EquipmentDisplayProps> = ({
  equipmentDisplay,
  monthlyPayment,
  remarks
}) => {
  return (
    <Card className="mb-6">
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-lg">Équipement et financement</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Label className="font-medium text-gray-500">Équipement</Label>
            <p className="mt-1 whitespace-pre-line">{equipmentDisplay}</p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="text-sm text-blue-700 mb-1">Mensualité</div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(monthlyPayment)} HTVA/mois
              </div>
            </div>
          </div>
        </div>
        
        {remarks && (
          <>
            <Separator className="my-6" />
            <div>
              <Label className="font-medium text-gray-500">Remarques</Label>
              <p className="mt-1 whitespace-pre-line">{remarks}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentDisplay;

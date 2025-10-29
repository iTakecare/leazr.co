import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AllDurationResults } from '@/utils/brokerCalculations';
import { formatCurrency } from '@/lib/utils';

interface BrokerDurationResultsProps {
  results: AllDurationResults;
  selectedDuration: number;
  onSelectDuration: (duration: number) => void;
  calculationMode: 'purchase_price' | 'rent';
}

const BrokerDurationResults: React.FC<BrokerDurationResultsProps> = ({
  results,
  selectedDuration,
  onSelectDuration,
  calculationMode
}) => {
  const sortedDurations = Object.keys(results)
    .map(Number)
    .sort((a, b) => a - b);

  if (sortedDurations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultats par durée</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Durée</TableHead>
              <TableHead className="text-right">Prix d'achat HT</TableHead>
              <TableHead className="text-right">Loyer mensuel</TableHead>
              <TableHead className="text-right">Coefficient</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDurations.map((duration) => {
              const result = results[duration];
              const isSelected = duration === selectedDuration;
              
              return (
                <TableRow
                  key={duration}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onSelectDuration(duration)}
                >
                  <TableCell className="font-medium">
                    {duration} mois
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(result.purchasePrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(result.monthlyPayment)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.coefficient.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default BrokerDurationResults;

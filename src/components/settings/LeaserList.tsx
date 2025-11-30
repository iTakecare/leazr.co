
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building2, Pencil, Trash2, Tag, Loader2, Copy } from "lucide-react";
import { Leaser } from "@/types/equipment";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface LeaserListProps {
  leasers: Leaser[];
  isLoading: boolean;
  onEdit: (leaser: Leaser) => void;
  onDelete: (id: string) => void;
  onDuplicate: (leaser: Leaser) => void;
}

const LeaserList = ({ leasers, isLoading, onEdit, onDelete, onDuplicate }: LeaserListProps) => {
  // Helper function to format range display
  const formatRangeDisplay = (range: any, useDurationCoefficients: boolean) => {
    const minFormatted = range.min.toLocaleString('fr-FR');
    const maxFormatted = range.max.toLocaleString('fr-FR');
    
    if (useDurationCoefficients && range.duration_coefficients && range.duration_coefficients.length > 0) {
      const durations = range.duration_coefficients.map((dc: any) => dc.duration_months).sort((a: number, b: number) => a - b);
      const minDuration = durations[0];
      const maxDuration = durations[durations.length - 1];
      return `${minFormatted}€ - ${maxFormatted}€ (${durations.length} durées: ${minDuration}-${maxDuration}m)`;
    }
    
    return `${minFormatted}€ - ${maxFormatted}€ (coef: ${range.coefficient})`;
  };

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Nom</TableHead>
              <TableHead>Tranches</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leasers.map((leaser) => {
              const useDurationCoefficients = (leaser as any).use_duration_coefficients || false;
              
              return (
                <TableRow key={leaser.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md">
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
                      {leaser.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {leaser.ranges.map((range) => (
                        <span 
                          key={range.id} 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {formatRangeDisplay(range, useDurationCoefficients)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onDuplicate(leaser)}
                        title="Dupliquer"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Dupliquer</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onEdit(leaser)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Modifier</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onDelete(leaser.id)}
                        className="text-destructive hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Supprimer</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {leasers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Aucun leaser disponible. Ajoutez votre premier leaser.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );
};

export default LeaserList;

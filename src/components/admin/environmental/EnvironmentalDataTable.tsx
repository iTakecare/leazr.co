import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, ExternalLink, Leaf, Droplets, Zap, Trash2 } from "lucide-react";
import { CategoryWithEnvironmental } from "@/types/environmental";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface EnvironmentalDataTableProps {
  categories: CategoryWithEnvironmental[];
  onEdit: (categoryId: string) => void;
}

const EnvironmentalDataTable: React.FC<EnvironmentalDataTableProps> = ({ categories, onEdit }) => {
  const formatNumber = (num: number | null | undefined): string => {
    if (!num || num === 0) return "0";
    return num.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  };

  const getSourceBadge = (sourceUrl?: string) => {
    if (!sourceUrl) return <Badge variant="outline">Non défini</Badge>;
    
    if (sourceUrl.includes('impactco2')) {
      return <Badge variant="secondary">Impact CO2</Badge>;
    } else if (sourceUrl.includes('ademe')) {
      return <Badge variant="default">ADEME</Badge>;
    } else {
      return <Badge variant="outline">Personnalisé</Badge>;
    }
  };

  const getLastUpdated = (timestamp?: string) => {
    if (!timestamp) return "Jamais";
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
    } catch {
      return "Inconnu";
    }
  };

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-32 text-center">
          <Leaf className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Aucune donnée environnementale trouvée</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez des données d'impact pour vos catégories de produits
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Catégorie</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Leaf className="h-4 w-4 text-green-600" />
                    CO2 (kg)
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    Énergie (kWh)
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Droplets className="h-4 w-4 text-blue-600" />
                    Eau (L)
                  </div>
                </TableHead>
                <TableHead className="text-center">Source</TableHead>
                <TableHead className="text-center">Dernière MAJ</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => {
                const impact = category.environmental_impact;
                const hasCO2Impact = (category.co2_savings_kg || 0) > 0;
                const hasEnergyImpact = (impact?.energy_savings_kwh || 0) > 0;
                const hasWaterImpact = (impact?.water_savings_liters || 0) > 0;
                
                return (
                  <TableRow key={category.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{category.translation}</div>
                        <div className="text-sm text-muted-foreground">{category.name}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className={`font-mono text-sm ${hasCO2Impact ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
                        {hasCO2Impact ? '-' : ''}{formatNumber(category.co2_savings_kg)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className={`font-mono text-sm ${hasEnergyImpact ? 'text-yellow-700 font-medium' : 'text-muted-foreground'}`}>
                        {formatNumber(impact?.energy_savings_kwh)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className={`font-mono text-sm ${hasWaterImpact ? 'text-blue-700 font-medium' : 'text-muted-foreground'}`}>
                        {formatNumber(impact?.water_savings_liters)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getSourceBadge(impact?.source_url)}
                        {impact?.source_url && (
                          <a
                            href={impact.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-xs text-muted-foreground">
                        {getLastUpdated(impact?.last_updated)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(category.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnvironmentalDataTable;
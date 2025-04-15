
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
import { Building2, Pencil, Trash2, Tag, Loader2, Star } from "lucide-react";
import { Leaser } from "@/types/equipment";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface LeaserListProps {
  leasers: Leaser[];
  isLoading: boolean;
  onEdit: (leaser: Leaser) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

const LeaserList = ({ leasers, isLoading, onEdit, onDelete, onSetDefault }: LeaserListProps) => {
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
            {leasers.map((leaser) => (
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
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {leaser.name}
                        {leaser.is_default && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-500 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-500" />
                            Par défaut
                          </Badge>
                        )}
                      </div>
                    </div>
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
                        {range.min}€ - {range.max}€ ({range.coefficient}%)
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!leaser.is_default && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onSetDefault(leaser.id)}
                        className="text-amber-500 hover:text-amber-600"
                      >
                        <Star className="h-4 w-4 mr-1" />
                        <span>Définir par défaut</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onEdit(leaser)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Modifier</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDelete(leaser.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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

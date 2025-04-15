
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2, Star, CheckCircle2, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Leaser } from "@/types/equipment";
import { setDefaultLeaser } from "@/services/leaserService";
import { toast } from "sonner";

interface LeaserListProps {
  leasers: Leaser[];
  isLoading: boolean;
  onEdit: (leaser: Leaser) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

const LeaserList: React.FC<LeaserListProps> = ({ 
  leasers, 
  isLoading, 
  onEdit, 
  onDelete,
  onRefresh
}) => {
  const [settingDefault, setSettingDefault] = React.useState<string | null>(null);

  const handleSetDefault = async (id: string) => {
    try {
      setSettingDefault(id);
      const success = await setDefaultLeaser(id);
      if (success && onRefresh) {
        onRefresh();
        toast.success("Leaser défini comme leaser par défaut");
      }
    } catch (error) {
      console.error("Erreur lors de la définition du leaser par défaut:", error);
      toast.error("Erreur lors de la définition du leaser par défaut");
    } finally {
      setSettingDefault(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Logo</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Tranches</TableHead>
            <TableHead className="w-[100px]">Par défaut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Chargement des leasers...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : leasers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Aucun leaser trouvé
              </TableCell>
            </TableRow>
          ) : (
            leasers.map((leaser) => (
              <TableRow key={leaser.id}>
                <TableCell>
                  {leaser.logo_url ? (
                    <div className="w-10 h-10 rounded-md overflow-hidden border flex items-center justify-center bg-white p-1">
                      <img
                        src={leaser.logo_url}
                        alt={leaser.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-md border bg-gray-50 flex items-center justify-center">
                      <span className="text-xs text-gray-500 font-mono">
                        {leaser.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{leaser.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {leaser.ranges.map((range) => (
                      <Badge
                        key={range.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {range.min.toLocaleString()} - {range.max.toLocaleString()} €: {range.coefficient}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {leaser.is_default ? (
                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Par défaut</span>
                    </Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSetDefault(leaser.id)}
                      disabled={settingDefault === leaser.id}
                    >
                      {settingDefault === leaser.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          <span>Définition...</span>
                        </>
                      ) : (
                        <>
                          <Star className="h-3 w-3 mr-1" />
                          <span>Définir par défaut</span>
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(leaser)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(leaser.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                      {!leaser.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(leaser.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Définir par défaut
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaserList;

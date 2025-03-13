
import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Image as ImageIcon, 
  Tag
} from "lucide-react";
import { Leaser } from "@/types/equipment";
import { defaultLeasers } from "@/data/leasers";

interface Range {
  id: string;
  min: number;
  max: number;
  coefficient: number;
}

const LeaserManager = () => {
  const [leasers, setLeasers] = useState<Leaser[]>(defaultLeasers);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLeaser, setCurrentLeaser] = useState<Leaser | null>(null);
  const [tempRanges, setTempRanges] = useState<Range[]>([]);
  
  const handleOpenSheet = (leaser?: Leaser) => {
    if (leaser) {
      setCurrentLeaser(leaser);
      setTempRanges([...leaser.ranges]);
      setIsEditMode(true);
    } else {
      setCurrentLeaser(null);
      setTempRanges([{ id: "1", min: 0, max: 0, coefficient: 0 }]);
      setIsEditMode(false);
    }
    setIsOpen(true);
  };
  
  const handleCloseSheet = () => {
    setIsOpen(false);
    setCurrentLeaser(null);
    setTempRanges([]);
  };
  
  const handleRangeChange = (index: number, field: keyof Range, value: number) => {
    const newRanges = [...tempRanges];
    newRanges[index][field] = value;
    setTempRanges(newRanges);
  };
  
  const handleAddRange = () => {
    const lastRange = tempRanges[tempRanges.length - 1];
    const newRangeId = String(parseInt(lastRange.id) + 1);
    
    setTempRanges([
      ...tempRanges,
      {
        id: newRangeId,
        min: lastRange.max + 0.01,
        max: lastRange.max + 5000,
        coefficient: lastRange.coefficient
      }
    ]);
  };
  
  const handleRemoveRange = (index: number) => {
    if (tempRanges.length > 1) {
      const newRanges = [...tempRanges];
      newRanges.splice(index, 1);
      setTempRanges(newRanges);
    }
  };
  
  const handleSaveLeaser = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newLeaser: Leaser = {
      id: currentLeaser?.id || `leaser-${Date.now()}`,
      name: formData.get("name") as string,
      logo_url: formData.get("logo_url") as string || null,
      ranges: tempRanges
    };
    
    if (isEditMode) {
      setLeasers(leasers.map(leaser => 
        leaser.id === newLeaser.id ? newLeaser : leaser
      ));
    } else {
      setLeasers([...leasers, newLeaser]);
    }
    
    handleCloseSheet();
  };
  
  const handleDeleteLeaser = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce leaser ?")) {
      setLeasers(leasers.filter(leaser => leaser.id !== id));
    }
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Leasers</span>
            </CardTitle>
            <Button onClick={() => handleOpenSheet()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter un leaser</span>
            </Button>
          </div>
          <CardDescription>
            Gérez les organismes de financement et leurs tranches de coefficients.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center overflow-hidden">
                        {leaser.logo_url ? (
                          <img 
                            src={leaser.logo_url} 
                            alt={leaser.name} 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
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
                          {range.min}€ - {range.max}€ ({range.coefficient})
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenSheet(leaser)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Modifier</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteLeaser(leaser.id)}
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
        </CardContent>
      </Card>
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? 'Modifier le leaser' : 'Ajouter un leaser'}</SheetTitle>
            <SheetDescription>
              {isEditMode 
                ? 'Modifiez les informations et les tranches du leaser.'
                : 'Ajoutez un nouvel organisme de financement.'}
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleSaveLeaser} className="mt-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du leaser</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={currentLeaser?.name || ""}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL du logo (optionnel)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="logo_url" 
                    name="logo_url" 
                    defaultValue={currentLeaser?.logo_url || ""}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Tranches de coefficients</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddRange}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                
                <div className="space-y-3 mt-3">
                  {tempRanges.map((range, index) => (
                    <div key={range.id} className="flex gap-2">
                      <div className="flex flex-col space-y-1 w-1/3">
                        <label className="text-xs text-muted-foreground">Min (€)</label>
                        <Input 
                          type="number"
                          value={range.min}
                          onChange={(e) => handleRangeChange(index, 'min', parseFloat(e.target.value))}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="flex flex-col space-y-1 w-1/3">
                        <label className="text-xs text-muted-foreground">Max (€)</label>
                        <Input 
                          type="number"
                          value={range.max}
                          onChange={(e) => handleRangeChange(index, 'max', parseFloat(e.target.value))}
                          min={range.min + 0.01}
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="flex flex-col space-y-1 w-1/3">
                        <label className="text-xs text-muted-foreground">Coefficient</label>
                        <Input 
                          type="number"
                          value={range.coefficient}
                          onChange={(e) => handleRangeChange(index, 'coefficient', parseFloat(e.target.value))}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveRange(index)}
                        disabled={tempRanges.length <= 1}
                        className="mt-auto h-10 w-10 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseSheet}
              >
                Annuler
              </Button>
              <Button type="submit">
                {isEditMode ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default LeaserManager;


import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Trash, ChevronsUpDown, Edit } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface Field {
  id: string;
  name: string;
  value: string;
  isVisible: boolean;
  page: number;
  position: {
    x: number;
    y: number;
  };
  style?: {
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
  };
}

interface PDFTemplateFieldsEditorProps {
  fields: Field[];
  onUpdate: (fields: Field[]) => void;
}

const PDFTemplateFieldsEditor: React.FC<PDFTemplateFieldsEditorProps> = ({ fields, onUpdate }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [newField, setNewField] = useState<Partial<Field>>({
    name: "",
    value: "",
    isVisible: true,
    page: 0,
    position: { x: 10, y: 10 },
    style: {
      fontSize: 12,
      fontWeight: "normal",
      fontStyle: "normal",
      color: "#000000"
    }
  });
  const [activeTab, setActiveTab] = useState("all");

  const fieltersPerPage = (page: number) => {
    return fields.filter(f => f.page === page);
  };

  const handleAddField = () => {
    if (!newField.name || !newField.value) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const fieldToAdd: Field = {
      id: uuidv4(),
      name: newField.name || "Nouveau champ",
      value: newField.value || "",
      isVisible: newField.isVisible !== undefined ? newField.isVisible : true,
      page: newField.page || 0,
      position: newField.position || { x: 10, y: 10 },
      style: newField.style || {
        fontSize: 12,
        fontWeight: "normal",
        fontStyle: "normal",
        color: "#000000"
      }
    };

    onUpdate([...fields, fieldToAdd]);
    setIsAddDialogOpen(false);
    setNewField({
      name: "",
      value: "",
      isVisible: true,
      page: 0,
      position: { x: 10, y: 10 },
      style: {
        fontSize: 12,
        fontWeight: "normal",
        fontStyle: "normal",
        color: "#000000"
      }
    });
    toast.success("Champ ajouté avec succès");
  };

  const handleDeleteField = (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce champ ?")) {
      return;
    }
    
    onUpdate(fields.filter(field => field.id !== id));
    toast.success("Champ supprimé avec succès");
  };

  const handleEditField = (field: Field) => {
    setEditingField(field);
    setIsEditDialogOpen(true);
  };

  const handleUpdateField = () => {
    if (!editingField) return;

    const updatedFields = fields.map(field => 
      field.id === editingField.id ? editingField : field
    );
    
    onUpdate(updatedFields);
    setIsEditDialogOpen(false);
    setEditingField(null);
    toast.success("Champ mis à jour avec succès");
  };

  const handleEditFieldChange = (key: string, value: any) => {
    if (!editingField) return;

    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setEditingField({
        ...editingField,
        [parent]: {
          ...editingField[parent],
          [child]: value
        }
      });
    } else {
      setEditingField({
        ...editingField,
        [key]: value
      });
    }
  };

  const handleNewFieldChange = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setNewField({
        ...newField,
        [parent]: {
          ...newField[parent],
          [child]: value
        }
      });
    } else {
      setNewField({
        ...newField,
        [key]: value
      });
    }
  };

  const handleToggleVisibility = (id: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === id) {
        return {
          ...field,
          isVisible: !field.isVisible
        };
      }
      return field;
    });
    
    onUpdate(updatedFields);
  };

  // Obtenir les numéros de page uniques
  const uniquePages = Array.from(new Set(fields.map(f => f.page))).sort((a, b) => a - b);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Champs du modèle</h3>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un champ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau champ</DialogTitle>
                <DialogDescription>
                  Définissez les propriétés du champ à ajouter dans le modèle.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="new-field-name" className="text-right">
                    Nom
                  </Label>
                  <Input
                    id="new-field-name"
                    value={newField.name || ""}
                    onChange={(e) => handleNewFieldChange("name", e.target.value)}
                    className="col-span-3"
                    placeholder="Nom du champ"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="new-field-value" className="text-right">
                    Valeur
                  </Label>
                  <Input
                    id="new-field-value"
                    value={newField.value || ""}
                    onChange={(e) => handleNewFieldChange("value", e.target.value)}
                    className="col-span-3"
                    placeholder="{client_name}"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="new-field-page" className="text-right">
                    Page
                  </Label>
                  <Input
                    id="new-field-page"
                    type="number"
                    min="0"
                    value={newField.page || 0}
                    onChange={(e) => handleNewFieldChange("page", parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="new-field-x" className="text-right">
                      Position X
                    </Label>
                    <Input
                      id="new-field-x"
                      type="number"
                      min="0"
                      value={newField.position?.x || 0}
                      onChange={(e) => handleNewFieldChange("position.x", parseInt(e.target.value))}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="new-field-y" className="text-right">
                      Position Y
                    </Label>
                    <Input
                      id="new-field-y"
                      type="number"
                      min="0"
                      value={newField.position?.y || 0}
                      onChange={(e) => handleNewFieldChange("position.y", parseInt(e.target.value))}
                      className="col-span-3"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="new-field-font-size" className="text-right">
                    Taille police
                  </Label>
                  <Input
                    id="new-field-font-size"
                    type="number"
                    min="8"
                    max="36"
                    value={newField.style?.fontSize || 12}
                    onChange={(e) => handleNewFieldChange("style.fontSize", parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="new-field-color" className="text-right">
                    Couleur
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      id="new-field-color"
                      type="text"
                      value={newField.style?.color || "#000000"}
                      onChange={(e) => handleNewFieldChange("style.color", e.target.value)}
                      className="flex-grow"
                    />
                    <input
                      type="color"
                      value={newField.style?.color || "#000000"}
                      onChange={(e) => handleNewFieldChange("style.color", e.target.value)}
                      className="w-10 h-10 p-1 border rounded"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="new-field-visible" className="text-right">
                    Visible
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="new-field-visible"
                      checked={newField.isVisible}
                      onCheckedChange={(checked) => handleNewFieldChange("isVisible", checked)}
                    />
                    <Label htmlFor="new-field-visible">
                      {newField.isVisible ? "Oui" : "Non"}
                    </Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddField}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le champ</DialogTitle>
                <DialogDescription>
                  Modifiez les propriétés du champ sélectionné.
                </DialogDescription>
              </DialogHeader>
              
              {editingField && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="edit-field-name" className="text-right">
                      Nom
                    </Label>
                    <Input
                      id="edit-field-name"
                      value={editingField.name}
                      onChange={(e) => handleEditFieldChange("name", e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="edit-field-value" className="text-right">
                      Valeur
                    </Label>
                    <Input
                      id="edit-field-value"
                      value={editingField.value}
                      onChange={(e) => handleEditFieldChange("value", e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="edit-field-page" className="text-right">
                      Page
                    </Label>
                    <Input
                      id="edit-field-page"
                      type="number"
                      min="0"
                      value={editingField.page}
                      onChange={(e) => handleEditFieldChange("page", parseInt(e.target.value))}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-4 items-center gap-2">
                      <Label htmlFor="edit-field-x" className="text-right">
                        Position X
                      </Label>
                      <Input
                        id="edit-field-x"
                        type="number"
                        min="0"
                        value={editingField.position.x}
                        onChange={(e) => handleEditFieldChange("position.x", parseInt(e.target.value))}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-2">
                      <Label htmlFor="edit-field-y" className="text-right">
                        Position Y
                      </Label>
                      <Input
                        id="edit-field-y"
                        type="number"
                        min="0"
                        value={editingField.position.y}
                        onChange={(e) => handleEditFieldChange("position.y", parseInt(e.target.value))}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="edit-field-font-size" className="text-right">
                      Taille police
                    </Label>
                    <Input
                      id="edit-field-font-size"
                      type="number"
                      min="8"
                      max="36"
                      value={editingField.style?.fontSize || 12}
                      onChange={(e) => handleEditFieldChange("style.fontSize", parseInt(e.target.value))}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="edit-field-color" className="text-right">
                      Couleur
                    </Label>
                    <div className="col-span-3 flex gap-2">
                      <Input
                        id="edit-field-color"
                        type="text"
                        value={editingField.style?.color || "#000000"}
                        onChange={(e) => handleEditFieldChange("style.color", e.target.value)}
                        className="flex-grow"
                      />
                      <input
                        type="color"
                        value={editingField.style?.color || "#000000"}
                        onChange={(e) => handleEditFieldChange("style.color", e.target.value)}
                        className="w-10 h-10 p-1 border rounded"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="edit-field-visible" className="text-right">
                      Visible
                    </Label>
                    <div className="flex items-center space-x-2 col-span-3">
                      <Switch
                        id="edit-field-visible"
                        checked={editingField.isVisible}
                        onCheckedChange={(checked) => handleEditFieldChange("isVisible", checked)}
                      />
                      <Label htmlFor="edit-field-visible">
                        {editingField.isVisible ? "Oui" : "Non"}
                      </Label>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdateField}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tous les champs</TabsTrigger>
            {uniquePages.map((page, index) => (
              <TabsTrigger key={index} value={`page-${page}`}>
                Page {page}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="all">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Position (X,Y)</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Aucun champ défini. Ajoutez-en un pour commencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  fields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>{field.name}</TableCell>
                      <TableCell>{field.value}</TableCell>
                      <TableCell>{field.page}</TableCell>
                      <TableCell>
                        {field.position.x}, {field.position.y}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={field.isVisible}
                          onCheckedChange={() => handleToggleVisibility(field.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditField(field)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteField(field.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
          
          {uniquePages.map((page, index) => (
            <TabsContent key={index} value={`page-${page}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Position (X,Y)</TableHead>
                    <TableHead>Visible</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieltersPerPage(page).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Aucun champ défini pour la page {page}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fieltersPerPage(page).map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.name}</TableCell>
                        <TableCell>{field.value}</TableCell>
                        <TableCell>
                          {field.position.x}, {field.position.y}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={field.isVisible}
                            onCheckedChange={() => handleToggleVisibility(field.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditField(field)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteField(field.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PDFTemplateFieldsEditor;

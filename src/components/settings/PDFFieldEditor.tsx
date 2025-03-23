
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Type, Trash, MoveHorizontal, MoveVertical, ArrowLeftRight, ArrowUpDown
} from "lucide-react";
import ColorPicker from "../ui/ColorPicker";

interface FieldEditorProps {
  field: any;
  onChange: (updates: any) => void;
  onDelete: () => void;
}

const FieldEditor = ({ field, onChange, onDelete }: FieldEditorProps) => {
  const fontFamilies = [
    "Arial", "Helvetica", "Times New Roman", "Times", "Courier New", 
    "Courier", "Verdana", "Georgia", "Palatino", "Garamond", "Bookman",
    "Tahoma", "Trebuchet MS", "Arial Black", "Impact"
  ];

  const fieldTypes = [
    { value: "static", label: "Texte statique" },
    { value: "client.name", label: "Nom du client" },
    { value: "client.company", label: "Société du client" },
    { value: "client.email", label: "Email du client" },
    { value: "client.phone", label: "Téléphone du client" },
    { value: "client.address", label: "Adresse du client" },
    { value: "offer.amount", label: "Montant de l'offre" },
    { value: "offer.monthly_payment", label: "Paiement mensuel" },
    { value: "offer.equipment_description", label: "Description de l'équipement" },
    { value: "date", label: "Date du jour" }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fieldType">Type de champ</Label>
        <Select
          value={field.fieldType}
          onValueChange={(value) => onChange({ fieldType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le type" />
          </SelectTrigger>
          <SelectContent>
            {fieldTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {field.fieldType === "static" && (
        <div className="space-y-2">
          <Label htmlFor="value">Texte</Label>
          <Input
            id="value"
            value={field.value}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="x">Position X</Label>
          <div className="flex">
            <Input
              id="x"
              type="number"
              value={field.x}
              onChange={(e) => onChange({ x: parseInt(e.target.value) })}
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="ml-1" 
              onClick={() => onChange({ x: field.x - 5 })}
            >
              <MoveHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="y">Position Y</Label>
          <div className="flex">
            <Input
              id="y"
              type="number"
              value={field.y}
              onChange={(e) => onChange({ y: parseInt(e.target.value) })}
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="ml-1"
              onClick={() => onChange({ y: field.y - 5 })}
            >
              <MoveVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="width">Largeur</Label>
          <div className="flex">
            <Input
              id="width"
              type="number"
              value={field.width}
              onChange={(e) => onChange({ width: parseInt(e.target.value) })}
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="ml-1"
              onClick={() => onChange({ width: field.width + 10 })}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Hauteur</Label>
          <div className="flex">
            <Input
              id="height"
              type="number"
              value={field.height}
              onChange={(e) => onChange({ height: parseInt(e.target.value) })}
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="ml-1"
              onClick={() => onChange({ height: field.height + 5 })}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fontSize">Taille de police</Label>
        <Input
          id="fontSize"
          type="number"
          value={field.fontSize}
          onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fontFamily">Police</Label>
        <Select
          value={field.fontFamily}
          onValueChange={(value) => onChange({ fontFamily: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une police" />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Couleur du texte</Label>
        <ColorPicker
          color={field.color || "#000000"}
          onChange={(color) => onChange({ color })}
        />
      </div>

      <div className="space-y-2">
        <Label>Style du texte</Label>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant={field.bold ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ bold: !field.bold })}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={field.italic ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ italic: !field.italic })}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={field.alignment === "left" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ alignment: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={field.alignment === "center" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ alignment: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={field.alignment === "right" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ alignment: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button 
        variant="destructive" 
        onClick={onDelete} 
        className="w-full mt-4"
      >
        <Trash className="h-4 w-4 mr-1" />
        Supprimer ce champ
      </Button>
    </div>
  );
};

export default FieldEditor;

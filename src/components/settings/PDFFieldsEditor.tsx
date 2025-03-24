
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { PDFField } from "./PDFTemplateWithFields";

interface PDFFieldsEditorProps {
  field: PDFField;
  onUpdate: (field: PDFField) => void;
  onDelete: () => void;
}

const PDFFieldsEditor = ({ field, onUpdate, onDelete }: PDFFieldsEditorProps) => {
  const [localField, setLocalField] = useState<PDFField>({ ...field });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedField = { ...localField, [name]: value };
    setLocalField(updatedField);
    onUpdate(updatedField);
  };

  const handleNumberChange = (name: string, value: number) => {
    const updatedField = { ...localField, [name]: value };
    setLocalField(updatedField);
    onUpdate(updatedField);
  };

  const handleBooleanChange = (name: string, checked: boolean) => {
    const updatedField = { ...localField, [name]: checked };
    setLocalField(updatedField);
    onUpdate(updatedField);
  };

  const handleSaveToDatabaseChange = (enabled: boolean) => {
    const saveToDatabase = localField.saveToDatabase || {
      enabled: false,
      fieldName: '',
      table: ''
    };
    
    const updatedField = {
      ...localField,
      saveToDatabase: {
        ...saveToDatabase,
        enabled
      }
    };
    
    setLocalField(updatedField);
    onUpdate(updatedField);
  };

  const handleDatabasePropertyChange = (property: string, value: string) => {
    const saveToDatabase = localField.saveToDatabase || {
      enabled: false,
      fieldName: '',
      table: ''
    };
    
    const updatedField = {
      ...localField,
      saveToDatabase: {
        ...saveToDatabase,
        [property]: value
      }
    };
    
    setLocalField(updatedField);
    onUpdate(updatedField);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Propriétés du champ</h3>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Libellé</Label>
        <Input
          id="label"
          name="label"
          value={localField.label}
          onChange={handleChange}
          placeholder="Libellé du champ"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nom (identifiant)</Label>
        <Input
          id="name"
          name="name"
          value={localField.name}
          onChange={handleChange}
          placeholder="Nom technique du champ"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          value={localField.type}
          onValueChange={(value) => {
            const updatedField = {
              ...localField,
              type: value as "text" | "signature" | "date" | "checkbox"
            };
            setLocalField(updatedField);
            onUpdate(updatedField);
          }}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Sélectionner un type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texte</SelectItem>
            <SelectItem value="signature">Signature</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="checkbox">Case à cocher</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {localField.type === "text" && (
        <div className="space-y-2">
          <Label htmlFor="placeholder">Placeholder</Label>
          <Input
            id="placeholder"
            name="placeholder"
            value={localField.placeholder || ""}
            onChange={handleChange}
            placeholder="Texte indicatif"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="defaultValue">Valeur par défaut</Label>
        <Input
          id="defaultValue"
          name="defaultValue"
          value={localField.defaultValue || ""}
          onChange={handleChange}
          placeholder="Valeur par défaut"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="width">Largeur (%)</Label>
          <div className="flex items-center gap-2">
            <Slider
              id="width"
              min={5}
              max={100}
              step={1}
              value={[localField.width]}
              onValueChange={([value]) => handleNumberChange("width", value)}
            />
            <span className="text-sm w-10 text-center">{localField.width}%</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Hauteur (%)</Label>
          <div className="flex items-center gap-2">
            <Slider
              id="height"
              min={5}
              max={100}
              step={1}
              value={[localField.height]}
              onValueChange={([value]) => handleNumberChange("height", value)}
            />
            <span className="text-sm w-10 text-center">{localField.height}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="x">Position X (%)</Label>
          <div className="flex items-center gap-2">
            <Slider
              id="x"
              min={0}
              max={100}
              step={1}
              value={[localField.x]}
              onValueChange={([value]) => handleNumberChange("x", value)}
            />
            <span className="text-sm w-10 text-center">{localField.x}%</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="y">Position Y (%)</Label>
          <div className="flex items-center gap-2">
            <Slider
              id="y"
              min={0}
              max={100}
              step={1}
              value={[localField.y]}
              onValueChange={([value]) => handleNumberChange("y", value)}
            />
            <span className="text-sm w-10 text-center">{localField.y}%</span>
          </div>
        </div>
      </div>

      {localField.type === "text" && (
        <div className="space-y-2">
          <Label htmlFor="fontSize">Taille de police</Label>
          <div className="flex items-center gap-2">
            <Slider
              id="fontSize"
              min={8}
              max={32}
              step={1}
              value={[localField.fontSize || 14]}
              onValueChange={([value]) => handleNumberChange("fontSize", value)}
            />
            <span className="text-sm w-10 text-center">{localField.fontSize || 14}px</span>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="required"
          checked={localField.required || false}
          onCheckedChange={(checked) => handleBooleanChange("required", checked)}
        />
        <Label htmlFor="required">Champ obligatoire</Label>
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="saveToDatabase"
                checked={localField.saveToDatabase?.enabled || false}
                onCheckedChange={handleSaveToDatabaseChange}
              />
              <Label htmlFor="saveToDatabase">Enregistrer dans la base de données</Label>
            </div>

            {localField.saveToDatabase?.enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dbFieldName">Nom du champ</Label>
                  <Input
                    id="dbFieldName"
                    value={localField.saveToDatabase?.fieldName || ""}
                    onChange={(e) => handleDatabasePropertyChange("fieldName", e.target.value)}
                    placeholder="Nom du champ dans la base de données"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbTable">Table</Label>
                  <Select
                    value={localField.saveToDatabase?.table || ""}
                    onValueChange={(value) => handleDatabasePropertyChange("table", value)}
                  >
                    <SelectTrigger id="dbTable">
                      <SelectValue placeholder="Sélectionner une table" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Clients</SelectItem>
                      <SelectItem value="offers">Offres</SelectItem>
                      <SelectItem value="signatures">Signatures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFFieldsEditor;

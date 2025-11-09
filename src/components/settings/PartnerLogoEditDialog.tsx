import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

interface PartnerLogoEditDialogProps {
  logo: PartnerLogo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (logo: PartnerLogo) => void;
  onUploadLogo: (file: File) => Promise<string>;
}

export const PartnerLogoEditDialog = ({
  logo,
  open,
  onOpenChange,
  onSave,
  onUploadLogo,
}: PartnerLogoEditDialogProps) => {
  const [editedLogo, setEditedLogo] = useState<PartnerLogo | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (logo) {
      setEditedLogo({ ...logo });
    }
  }, [logo]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editedLogo) return;

    setIsUploading(true);
    try {
      const url = await onUploadLogo(file);
      setEditedLogo({ ...editedLogo, logo_url: url });
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (editedLogo) {
      onSave(editedLogo);
      onOpenChange(false);
    }
  };

  if (!editedLogo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Éditer le logo partenaire</DialogTitle>
          <DialogDescription>
            Modifiez les informations du logo partenaire
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Logo preview */}
          <div className="flex justify-center">
            <div className="w-48 h-24 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
              {editedLogo.logo_url ? (
                <img
                  src={editedLogo.logo_url}
                  alt={editedLogo.name}
                  className="object-contain w-full h-full p-2"
                />
              ) : (
                <span className="text-sm text-muted-foreground">Pas de logo</span>
              )}
            </div>
          </div>

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du partenaire</Label>
            <Input
              id="name"
              value={editedLogo.name}
              onChange={(e) =>
                setEditedLogo({ ...editedLogo, name: e.target.value })
              }
              placeholder="Ex: Microsoft"
            />
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <div className="flex gap-2">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="cursor-pointer"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => document.getElementById("logo")?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {isUploading && (
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
            )}
          </div>

          {/* Active switch */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Actif</Label>
              <p className="text-sm text-muted-foreground">
                Le logo sera affiché dans les PDF
              </p>
            </div>
            <Switch
              checked={editedLogo.is_active}
              onCheckedChange={(checked) =>
                setEditedLogo({ ...editedLogo, is_active: checked })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!editedLogo.name || !editedLogo.logo_url}>
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

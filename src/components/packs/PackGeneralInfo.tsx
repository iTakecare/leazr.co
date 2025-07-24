import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PackGeneralInfoProps {
  packData: {
    name: string;
    description?: string;
    image_url?: string;
    is_active: boolean;
    is_featured: boolean;
    admin_only: boolean;
    valid_from?: Date;
    valid_to?: Date;
  };
  onUpdate: (updates: Partial<PackGeneralInfoProps['packData']>) => void;
}

export const PackGeneralInfo = ({ packData, onUpdate }: PackGeneralInfoProps) => {
  const handleChange = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations de base</CardTitle>
          <CardDescription>
            Définissez les informations principales du pack
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du pack *</Label>
              <Input
                id="name"
                value={packData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Pack Bureau Complet"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">URL de l'image</Label>
              <Input
                id="image_url"
                value={packData.image_url || ""}
                onChange={(e) => handleChange("image_url", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={packData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Décrivez le contenu et les avantages de ce pack..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Période de validité</CardTitle>
          <CardDescription>
            Définissez optionnellement une période de validité pour ce pack
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !packData.valid_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {packData.valid_from ? (
                      format(packData.valid_from, "PPP", { locale: fr })
                    ) : (
                      "Sélectionner une date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={packData.valid_from}
                    onSelect={(date) => handleChange("valid_from", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !packData.valid_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {packData.valid_to ? (
                      format(packData.valid_to, "PPP", { locale: fr })
                    ) : (
                      "Sélectionner une date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={packData.valid_to}
                    onSelect={(date) => handleChange("valid_to", date)}
                    initialFocus
                    disabled={(date) => 
                      packData.valid_from ? date < packData.valid_from : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>
            Configurez les options d'affichage et d'accès du pack
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pack actif</Label>
              <p className="text-sm text-muted-foreground">
                Le pack sera visible dans le catalogue
              </p>
            </div>
            <Switch
              checked={packData.is_active}
              onCheckedChange={(checked) => handleChange("is_active", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pack en vedette</Label>
              <p className="text-sm text-muted-foreground">
                Mettre en avant ce pack dans les sections spéciales
              </p>
            </div>
            <Switch
              checked={packData.is_featured}
              onCheckedChange={(checked) => handleChange("is_featured", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Réservé aux administrateurs</Label>
              <p className="text-sm text-muted-foreground">
                Seuls les administrateurs pourront voir ce pack
              </p>
            </div>
            <Switch
              checked={packData.admin_only}
              onCheckedChange={(checked) => handleChange("admin_only", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
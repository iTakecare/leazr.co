import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProductVariants } from "@/hooks/products/useProductVariants";
import { useProductById } from "@/hooks/products/useProductById";
import {
  createClientCustomVariant,
  updateClientCustomVariant,
  type ClientCustomVariant,
  type CreateClientCustomVariantData,
  type UpdateClientCustomVariantData
} from "@/services/clientCustomVariantService";

interface ClientCustomVariantEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  productId: string;
  productName: string;
  variant?: ClientCustomVariant | null;
  onSuccess?: () => void;
}

const ClientCustomVariantEditor: React.FC<ClientCustomVariantEditorProps> = ({
  open,
  onOpenChange,
  clientId,
  productId,
  productName,
  variant,
  onSuccess
}) => {
  // Step management
  const [currentStep, setCurrentStep] = useState<"base" | "attributes" | "pricing" | "preview">("base");
  
  // Form states
  const [variantName, setVariantName] = useState("");
  const [baseVariantId, setBaseVariantId] = useState<string>("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [customPurchasePrice, setCustomPurchasePrice] = useState<string>("");
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<string>("");
  const [marginRate, setMarginRate] = useState<string>("");
  const [notes, setNotes] = useState("");
  
  // New attribute creation
  const [newAttributeKey, setNewAttributeKey] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");
  const [creationMode, setCreationMode] = useState<"existing" | "new">("existing");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch product data and variants
  const { product } = useProductById(productId);
  const { data: variantPrices } = useProductVariants(productId);

  // Reset form when dialog opens/closes or variant changes
  useEffect(() => {
    if (variant) {
      setVariantName(variant.variant_name);
      setAttributes(variant.attributes);
      setCustomPurchasePrice(variant.custom_purchase_price?.toString() || "");
      setCustomMonthlyPrice(variant.custom_monthly_price?.toString() || "");
      setMarginRate(variant.margin_rate?.toString() || "");
      setNotes(variant.notes || "");
    } else {
      setVariantName("");
      setBaseVariantId("");
      setAttributes({});
      setCustomPurchasePrice("");
      setCustomMonthlyPrice("");
      setMarginRate("");
      setNotes("");
      setCreationMode("existing");
      setCurrentStep("base");
    }
    setNewAttributeKey("");
    setNewAttributeValue("");
  }, [variant, open]);

  // Get available variant combinations and existing attributes
  const availableVariants = variantPrices || [];
  const productAttributes = product?.variation_attributes || {};
  const allAttributeKeys = Object.keys(productAttributes);

  // Load base variant attributes when selected
  const handleBaseVariantChange = (variantId: string) => {
    setBaseVariantId(variantId);
    if (variantId === "new") {
      setAttributes({});
      return;
    }
    
    const selectedVariant = availableVariants.find(v => v.id === variantId);
    if (selectedVariant) {
      setAttributes(selectedVariant.attributes || {});
    }
  };

  // Add attribute from existing product attributes
  const handleAddExistingAttribute = (key: string, value: string) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateClientCustomVariantData) => createClientCustomVariant(data),
    onSuccess: () => {
      toast({
        title: "Variante créée",
        description: "La variante personnalisée a été créée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-custom-variants", clientId, productId] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating custom variant:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la variante personnalisée.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientCustomVariantData }) =>
      updateClientCustomVariant(id, data),
    onSuccess: () => {
      toast({
        title: "Variante mise à jour",
        description: "La variante personnalisée a été mise à jour avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-custom-variants", clientId, productId] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating custom variant:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la variante personnalisée.",
        variant: "destructive",
      });
    },
  });

  const handleAddAttribute = () => {
    if (newAttributeKey && newAttributeValue) {
      setAttributes(prev => ({
        ...prev,
        [newAttributeKey]: newAttributeValue
      }));
      setNewAttributeKey("");
      setNewAttributeValue("");
    }
  };

  const handleRemoveAttribute = (key: string) => {
    setAttributes(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSubmit = () => {

    if (!variantName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la variante est requis.",
        variant: "destructive",
      });
      return;
    }

    const variantData = {
      client_id: clientId,
      product_id: productId,
      variant_name: variantName,
      attributes,
      custom_purchase_price: customPurchasePrice ? parseFloat(customPurchasePrice) : undefined,
      custom_monthly_price: customMonthlyPrice ? parseFloat(customMonthlyPrice) : undefined,
      margin_rate: marginRate ? parseFloat(marginRate) : undefined,
      notes: notes || undefined,
    };

    if (variant) {
      updateMutation.mutate({
        id: variant.id,
        data: {
          variant_name: variantData.variant_name,
          attributes: variantData.attributes,
          custom_purchase_price: variantData.custom_purchase_price,
          custom_monthly_price: variantData.custom_monthly_price,
          margin_rate: variantData.margin_rate,
          notes: variantData.notes,
        }
      });
    } else {
      createMutation.mutate(variantData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {variant ? "Modifier" : "Créer"} une variante personnalisée
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Produit: {productName}
          </p>
        </DialogHeader>

        {/* Step Navigation */}
        <div className="flex items-center justify-center space-x-4 py-4 border-b">
          {["base", "attributes", "pricing", "preview"].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step 
                  ? "bg-primary text-primary-foreground" 
                  : index < ["base", "attributes", "pricing", "preview"].indexOf(currentStep)
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}>
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium">{
                step === "base" ? "Base" : 
                step === "attributes" ? "Attributs" :
                step === "pricing" ? "Prix" : "Aperçu"
              }</span>
              {index < 3 && <ArrowRight className="ml-4 h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="py-6">
          {/* Step 1: Base Selection */}
          {currentStep === "base" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="variantName">Nom de la variante *</Label>
                <Input
                  id="variantName"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="Ex: Configuration AZERTY Pro"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Mode de création</Label>
                <Tabs value={creationMode} onValueChange={(value) => setCreationMode(value as "existing" | "new")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing">Basé sur l'existant</TabsTrigger>
                    <TabsTrigger value="new">Nouveaux attributs</TabsTrigger>
                  </TabsList>

                  <TabsContent value="existing" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Sélectionner une base</CardTitle>
                        <CardDescription>
                          Choisissez une variante existante comme point de départ
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select value={baseVariantId} onValueChange={handleBaseVariantChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une variante de base" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Nouveau (sans base)</SelectItem>
                            {availableVariants.map((variant) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`).join(", ") || "Variante standard"}
                                {variant.price && ` - ${variant.price}€`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {baseVariantId && baseVariantId !== "new" && (
                          <div className="mt-4 p-3 bg-muted rounded">
                            <div className="text-sm font-medium mb-2">Attributs de base sélectionnés:</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(attributes).map(([key, value]) => (
                                <Badge key={key} variant="secondary">{key}: {value}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="new" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Création libre</CardTitle>
                        <CardDescription>
                          Créez une variante entièrement personnalisée avec de nouveaux attributs
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          Vous pourrez définir de nouveaux attributs à l'étape suivante.
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          {/* Step 2: Attributes Configuration */}
          {currentStep === "attributes" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Configuration des attributs</Label>
                
                {/* Current attributes */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Attributs configurés:</div>
                  {Object.entries(attributes).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-3 border rounded">
                      <Badge variant="outline">{key}</Badge>
                      <span>:</span>
                      <span className="flex-1 font-medium">{value}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttribute(key)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {Object.keys(attributes).length === 0 && (
                    <div className="text-sm text-muted-foreground italic">Aucun attribut configuré</div>
                  )}
                </div>

                {/* Add from existing attributes */}
                {allAttributeKeys.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Ajouter un attribut existant</CardTitle>
                      <CardDescription>
                        Sélectionnez un attribut existant du produit
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {allAttributeKeys.map((key) => (
                        <div key={key} className="space-y-2">
                          <Label className="text-sm font-medium">{key}</Label>
                          <Select onValueChange={(value) => handleAddExistingAttribute(key, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder={`Choisir ${key.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {productAttributes[key]?.map((value) => (
                                <SelectItem key={value} value={value}>{value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Add custom attribute */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ajouter un nouvel attribut</CardTitle>
                    <CardDescription>
                      Créez un attribut spécifique pour ce client (ex: Type de clavier, Taille d'écran)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nom de l'attribut (ex: Type de clavier)"
                        value={newAttributeKey}
                        onChange={(e) => setNewAttributeKey(e.target.value)}
                      />
                      <Input
                        placeholder="Valeur (ex: AZERTY)"
                        value={newAttributeValue}
                        onChange={(e) => setNewAttributeValue(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddAttribute}
                        disabled={!newAttributeKey || !newAttributeValue}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {currentStep === "pricing" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customPurchasePrice">Prix d'achat personnalisé (€)</Label>
                  <Input
                    id="customPurchasePrice"
                    type="number"
                    step="0.01"
                    value={customPurchasePrice}
                    onChange={(e) => setCustomPurchasePrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customMonthlyPrice">Prix mensuel personnalisé (€)</Label>
                  <Input
                    id="customMonthlyPrice"
                    type="number"
                    step="0.01"
                    value={customMonthlyPrice}
                    onChange={(e) => setCustomMonthlyPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marginRate">Taux de marge (%)</Label>
                <Input
                  id="marginRate"
                  type="number"
                  step="0.01"
                  value={marginRate}
                  onChange={(e) => setMarginRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes optionnelles sur cette variante..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {currentStep === "preview" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Aperçu de la variante
                  </CardTitle>
                  <CardDescription>
                    Vérifiez les informations avant de créer la variante
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Nom:</Label>
                    <div className="mt-1 text-sm">{variantName || "Non défini"}</div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Attributs:</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(attributes).map(([key, value]) => (
                        <Badge key={key} variant="secondary">{key}: {value}</Badge>
                      ))}
                      {Object.keys(attributes).length === 0 && (
                        <span className="text-sm text-muted-foreground italic">Aucun attribut</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Prix d'achat:</Label>
                      <div className="mt-1 text-sm">{customPurchasePrice ? `${customPurchasePrice}€` : "Non défini"}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Prix mensuel:</Label>
                      <div className="mt-1 text-sm">{customMonthlyPrice ? `${customMonthlyPrice}€` : "Non défini"}</div>
                    </div>
                  </div>

                  {marginRate && (
                    <div>
                      <Label className="text-sm font-medium">Taux de marge:</Label>
                      <div className="mt-1 text-sm">{marginRate}%</div>
                    </div>
                  )}

                  {notes && (
                    <div>
                      <Label className="text-sm font-medium">Notes:</Label>
                      <div className="mt-1 text-sm">{notes}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm font-medium text-blue-900 mb-1">Comment cela apparaîtra au client:</div>
                <div className="text-sm text-blue-700">
                  Dans le catalogue, cette variante apparaîtra comme une option de configuration pour le produit "{productName}".
                  {Object.keys(attributes).length > 0 && (
                    <span> Les attributs {Object.keys(attributes).join(", ")} seront disponibles dans les dropdowns de sélection.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {currentStep !== "base" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const steps = ["base", "attributes", "pricing", "preview"];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1] as any);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            
            {currentStep !== "preview" ? (
              <Button
                type="button"
                onClick={() => {
                  const steps = ["base", "attributes", "pricing", "preview"];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex < steps.length - 1) {
                    setCurrentStep(steps[currentIndex + 1] as any);
                  }
                }}
                disabled={currentStep === "base" && !variantName.trim()}
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Enregistrement..."
                  : variant
                  ? "Mettre à jour"
                  : "Créer la variante"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCustomVariantEditor;

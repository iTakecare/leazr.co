
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Package, Send, ShoppingBasket, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createClientRequest } from "@/services/offerService";
import ProductCatalog from "@/components/ui/ProductCatalog";
import { Product } from "@/types/catalog";
import OfferCalculator from "@/components/ui/OfferCalculator";
import { motion } from "framer-motion";

const ClientEquipmentRequestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCatalog = () => {
    setIsCatalogOpen(true);
  };

  const handleCloseCatalog = () => {
    setIsCatalogOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    const adjustedProduct = {
      ...product,
      price: product.price,
      monthly_price: product.monthly_price
    };
    setSelectedProducts((prev) => [...prev, adjustedProduct]);
    toast.success(`${product.name} ajouté à votre sélection`);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleSubmitRequest = async (calculatedData: {
    totalAmount: number;
    monthlyPayment: number;
    coefficient: number;
    commission: number;
  }) => {
    if (!user || !user.id) {
      toast.error("Vous devez être connecté pour soumettre une demande");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    setIsSubmitting(true);

    try {
      const equipmentDescription = selectedProducts
        .map((p) => `${p.name} - ${p.monthly_price?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`)
        .join("\n");

      const requestData = {
        user_id: user.id,
        client_id: user?.client_id || null,
        client_name: user?.company || `${user?.first_name || ""} ${user?.last_name || ""}`,
        client_email: user?.email || "",
        equipment_description: equipmentDescription,
        additional_info: additionalInfo,
        amount: calculatedData.totalAmount,
        monthly_payment: calculatedData.monthlyPayment,
        coefficient: calculatedData.coefficient,
        commission: calculatedData.commission,
        type: "client_request",
      };

      const requestId = await createClientRequest(requestData);
      
      if (requestId) {
        toast.success("Votre demande a été soumise avec succès");
        navigate("/client/requests");
      } else {
        throw new Error("Erreur lors de la création de la demande");
      }
    } catch (error) {
      console.error("Erreur lors de la soumission de la demande:", error);
      toast.error("Une erreur est survenue lors de la soumission de votre demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-6 md:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nouvelle demande d'équipement</h1>
        <p className="text-muted-foreground mt-2">
          Sélectionnez les équipements dont vous avez besoin et nous vous proposerons des solutions de financement adaptées.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Équipements sélectionnés
              </CardTitle>
              <CardDescription>
                Sélectionnez les équipements que vous souhaitez financer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-md">
                  <ShoppingBasket className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-center text-muted-foreground">
                    Aucun équipement sélectionné
                  </p>
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Cliquez sur le bouton ci-dessous pour parcourir notre catalogue
                  </p>
                  <Button onClick={handleOpenCatalog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Parcourir le catalogue
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {selectedProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 bg-muted rounded-md overflow-hidden">
                            <img
                              src={product.image_url || product.imageUrl || '/placeholder.svg'}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.monthly_price?.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                  <Button onClick={handleOpenCatalog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un équipement
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations complémentaires</CardTitle>
              <CardDescription>
                Ajoutez toute information utile à votre demande
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Précisez vos besoins spécifiques, configurations souhaitées, etc."
                className="min-h-[120px]"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <OfferCalculator
            selectedProducts={selectedProducts}
            onRemoveProduct={handleRemoveProduct}
            onSaveOffer={handleSubmitRequest}
            clientName={user?.company || `${user?.first_name || ""} ${user?.last_name || ""}`}
            clientEmail={user?.email || ""}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Utiliser le même composant ProductCatalog que l'admin */}
      <ProductCatalog
        isOpen={isCatalogOpen}
        onClose={handleCloseCatalog}
        onSelectProduct={handleSelectProduct}
        isSheet={true}
        title="Catalogue de produits"
        description="Sélectionnez un produit pour l'ajouter à votre demande"
      />
    </div>
  );
};

export default ClientEquipmentRequestPage;

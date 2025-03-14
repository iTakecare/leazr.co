
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Calculator as CalcIcon, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";
import ProductCatalog from "@/components/ui/ProductCatalog";

const PartnerCreateOffer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  
  // Client information
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  
  // Equipment information
  const [equipment, setEquipment] = useState<any[]>([]);
  
  // Calculated values
  const [totalAmount, setTotalAmount] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [commission, setCommission] = useState(0);
  
  // Duration in months
  const [duration, setDuration] = useState(36); // Default to 36 months
  
  useEffect(() => {
    // Calculate totals whenever equipment changes
    const amount = equipment.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotalAmount(amount);
    
    // Simplified calculation for monthly payment (would be more complex in real life)
    // This is just a demo approximation
    const monthly = duration > 0 ? (amount / duration) * 1.1 : 0; // 10% financing cost
    setMonthlyPayment(monthly);
    
    // Calculate commission (example: 10% of monthly payment)
    const estimatedCommission = monthly * 0.1 * duration;
    setCommission(estimatedCommission);
  }, [equipment, duration]);
  
  const handleProductSelect = (product: any) => {
    // Check if product is already in the list
    const existingIndex = equipment.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
      // Update quantity if already exists
      const updatedEquipment = [...equipment];
      updatedEquipment[existingIndex].quantity += 1;
      setEquipment(updatedEquipment);
    } else {
      // Add new product with quantity 1
      setEquipment([...equipment, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
    
    setIsCatalogOpen(false);
  };
  
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedEquipment = [...equipment];
    updatedEquipment[index].quantity = newQuantity;
    setEquipment(updatedEquipment);
  };
  
  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    try {
      if (!user) {
        toast.error("Vous devez être connecté pour créer une offre");
        return;
      }
      
      if (!clientName || !clientEmail || equipment.length === 0) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      
      setSubmitting(true);
      
      // Format equipment for storage
      const equipmentDescription = equipment
        .map(item => `${item.name} (${item.quantity}x)`)
        .join(", ");
      
      // Create offer in database
      const offerData = {
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        client_company: clientCompany,
        equipment_description: equipmentDescription,
        amount: totalAmount,
        monthly_payment: monthlyPayment,
        commission: commission,
        status: 'pending',
        workflow_status: 'partner_created',
        type: 'partner_offer'
      };
      
      const { data, error } = await supabase
        .from('offers')
        .insert(offerData)
        .select('id')
        .single();
      
      if (error) throw error;
      
      toast.success("Offre créée avec succès!");
      navigate(`/partner/offers/${data.id}`);
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Une erreur s'est produite lors de la création de l'offre");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate("/partner/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Nouvelle offre client</h1>
              <p className="text-muted-foreground">Créez une offre pour votre client</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Client Information */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-medium mb-4">Informations client</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Nom du client *</Label>
                        <Input
                          id="clientName"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Nom complet"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Email *</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@example.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientCompany">Société</Label>
                      <Input
                        id="clientCompany"
                        value={clientCompany}
                        onChange={(e) => setClientCompany(e.target.value)}
                        placeholder="Nom de la société (optionnel)"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Equipment Selection */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Équipement</h2>
                    <Button onClick={() => setIsCatalogOpen(true)}>
                      Ajouter un produit
                    </Button>
                  </div>
                  
                  {equipment.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      Aucun équipement sélectionné. Cliquez sur "Ajouter un produit" pour commencer.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {equipment.map((item, index) => (
                        <div key={index} className="flex items-center justify-between border rounded-md p-3">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} par unité</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="w-10 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEquipment(index)}
                              className="ml-2 text-red-500"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Duration Selection */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-medium mb-4">Durée du leasing</h2>
                  <div className="flex flex-wrap gap-2">
                    {[24, 36, 48, 60].map((months) => (
                      <Button
                        key={months}
                        variant={duration === months ? "default" : "outline"}
                        onClick={() => setDuration(months)}
                      >
                        {months} mois
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Summary and Actions */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-medium mb-4">Résumé de l'offre</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Montant total:</span>
                      <span className="font-medium">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Durée:</span>
                      <span className="font-medium">{duration} mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mensualité:</span>
                      <span className="font-medium">{formatCurrency(monthlyPayment)}</span>
                    </div>
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between font-medium">
                      <span>Votre commission:</span>
                      <span className="text-green-600">{formatCurrency(commission)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button 
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || equipment.length === 0 || !clientName || !clientEmail}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Créer l'offre"
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                En créant cette offre, vous confirmez avoir l'accord du client pour soumettre cette demande.
              </p>
            </div>
          </div>
        </div>
      </Container>
      
      {/* Product Catalog Modal */}
      <ProductCatalog
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectProduct={handleProductSelect}
        isSheet={true}
        title="Ajouter un équipement"
        description="Sélectionnez un produit du catalogue à ajouter à votre offre"
      />
    </PageTransition>
  );
};

export default PartnerCreateOffer;

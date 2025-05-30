
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import {
  ShoppingCart,
  Plus,
  Minus,
  Send,
  MapPin,
  Mail,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { getClientIdForUser } from "@/utils/clientUserAssociation";
import { getClientEquipmentConfigs, createEquipmentRequest, ClientEquipmentConfig } from "@/services/equipmentRequestService";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";

interface CartItem {
  config: ClientEquipmentConfig;
  quantity: number;
}

const ClientEquipmentRequestPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [availableEquipment, setAvailableEquipment] = useState<ClientEquipmentConfig[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formData, setFormData] = useState({
    delivery_address: '',
    delivery_city: '',
    delivery_postal_code: '',
    delivery_country: 'France',
    additional_email: '',
    comments: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.id) return;
        
        const id = await getClientIdForUser(user.id);
        if (!id) {
          toast.error("Aucun client associé à votre compte");
          return;
        }
        
        setClientId(id);
        
        const [client, configs] = await Promise.all([
          getClientById(id),
          getClientEquipmentConfigs(id)
        ]);
        
        if (client) {
          setClientData(client);
          setFormData(prev => ({
            ...prev,
            delivery_address: client.address || '',
            delivery_city: client.city || '',
            delivery_postal_code: client.postal_code || '',
            delivery_country: client.country || 'France'
          }));
        }
        
        setAvailableEquipment(configs);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const addToCart = (config: ClientEquipmentConfig) => {
    setCart(prev => {
      const existing = prev.find(item => item.config.id === config.id);
      if (existing) {
        return prev.map(item =>
          item.config.id === config.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { config, quantity: 1 }];
    });
    toast.success(`${config.product?.name} ajouté au panier`);
  };

  const updateQuantity = (configId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.config.id !== configId));
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.config.id === configId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const getTotalMonthly = () => {
    return cart.reduce((total, item) => {
      const price = item.config.custom_monthly_price || item.config.product?.monthly_price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !clientData || cart.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement à votre demande");
      return;
    }

    setSubmitting(true);
    try {
      const requestData = {
        client_id: clientId,
        client_name: clientData.name,
        client_email: clientData.email || '',
        client_company: clientData.company,
        client_phone: clientData.phone,
        delivery_address: formData.delivery_address,
        delivery_city: formData.delivery_city,
        delivery_postal_code: formData.delivery_postal_code,
        delivery_country: formData.delivery_country,
        additional_email: formData.additional_email || undefined,
        comments: formData.comments || undefined,
        total_monthly_amount: getTotalMonthly()
      };

      const items = cart.map(item => ({
        product_id: item.config.product_id,
        product_name: item.config.product?.name || 'Produit inconnu',
        quantity: item.quantity,
        unit_monthly_price: item.config.custom_monthly_price || item.config.product?.monthly_price || 0,
        total_monthly_price: (item.config.custom_monthly_price || item.config.product?.monthly_price || 0) * item.quantity
      }));

      await createEquipmentRequest(requestData, items);
      
      toast.success("Votre demande a été envoyée avec succès ! Vous recevrez une confirmation par email.");
      setCart([]);
      setFormData({
        delivery_address: clientData.address || '',
        delivery_city: clientData.city || '',
        delivery_postal_code: clientData.postal_code || '',
        delivery_country: clientData.country || 'France',
        additional_email: '',
        comments: ''
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (availableEquipment.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Aucun équipement configuré</h3>
        <p className="text-muted-foreground">
          Contactez votre conseiller pour configurer les équipements disponibles pour vos demandes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Demande d'équipement</h1>
          <p className="text-muted-foreground">
            Sélectionnez les équipements dont vous avez besoin
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Catalogue d'équipements */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Équipements disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {availableEquipment.map((config) => (
                  <Card key={config.id} className="border-2 hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {config.product?.image_url && (
                          <img
                            src={config.product.image_url}
                            alt={config.product.name}
                            className="w-16 h-16 object-contain rounded-md bg-muted"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{config.product?.name}</h3>
                          {config.product?.brand && (
                            <Badge variant="outline" className="mb-2">{config.product.brand}</Badge>
                          )}
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(config.custom_monthly_price || config.product?.monthly_price || 0)} / mois
                            </div>
                            {config.custom_monthly_price && config.product?.monthly_price && config.custom_monthly_price !== config.product.monthly_price && (
                              <div className="text-sm text-muted-foreground line-through">
                                Prix standard: {formatCurrency(config.product.monthly_price)} / mois
                              </div>
                            )}
                          </div>
                          <Button 
                            onClick={() => addToCart(config)}
                            size="sm" 
                            className="mt-2 w-full"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panier et formulaire */}
        <div className="space-y-6">
          {/* Panier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Panier ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Votre panier est vide
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.config.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{item.config.product?.name}</h4>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.config.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.config.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency((item.config.custom_monthly_price || item.config.product?.monthly_price || 0) * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center font-bold">
                    <span>Total mensuel:</span>
                    <span className="text-primary">{formatCurrency(getTotalMonthly())}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulaire de livraison */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Informations de livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="delivery_address">Adresse de livraison</Label>
                    <Input
                      id="delivery_address"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="delivery_postal_code">Code postal</Label>
                      <Input
                        id="delivery_postal_code"
                        value={formData.delivery_postal_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_postal_code: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery_city">Ville</Label>
                      <Input
                        id="delivery_city"
                        value={formData.delivery_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_city: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="delivery_country">Pays</Label>
                    <Input
                      id="delivery_country"
                      value={formData.delivery_country}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_country: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="additional_email">Email supplémentaire (optionnel)</Label>
                    <Input
                      id="additional_email"
                      type="email"
                      value={formData.additional_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, additional_email: e.target.value }))}
                      placeholder="personne@exemple.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Une copie de la demande sera envoyée à cette adresse
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="comments">Commentaires (optionnel)</Label>
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                      placeholder="Informations supplémentaires..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Envoyer la demande
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientEquipmentRequestPage;


import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { createProductRequest } from '@/services/requestInfoService';
import CartItem from '@/components/cart/CartItem';
import { formatCurrency } from '@/utils/formatters';

const NewRequestPage: React.FC = () => {
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    hasDifferentShippingAddress: false,
    shippingAddress: '',
    shippingCity: '',
    shippingPostalCode: '',
    shippingCountry: 'France',
    vatNumber: '',
    isVatExempt: false
  });
  
  // Gérer les changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Gérer les changements de checkbox
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Soumettre la demande
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: "Votre panier est vide",
        description: "Ajoutez des produits à votre panier avant de soumettre une demande.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Préparer les données d'équipement à partir du panier
      const equipment = items.map(item => ({
        name: item.product.name,
        brand: item.product.brand || 'Non spécifié',
        quantity: item.quantity,
        duration: item.duration,
        monthly_price: item.product.monthly_price,
        options: item.selectedOptions || {}
      }));
      
      // Créer l'objet de requête
      const requestData = {
        client_name: formData.clientName,
        client_email: formData.email,
        client_company: formData.company,
        equipment_description: JSON.stringify(equipment),
        message: formData.message,
        amount: cartTotal * 36, // Montant total (mensualité * durée)
        monthly_payment: cartTotal,
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        duration: 36, // Durée fixée à 36 mois
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country,
        has_different_shipping_address: formData.hasDifferentShippingAddress,
        shipping_address: formData.hasDifferentShippingAddress ? formData.shippingAddress : formData.address,
        shipping_city: formData.hasDifferentShippingAddress ? formData.shippingCity : formData.city,
        shipping_postal_code: formData.hasDifferentShippingAddress ? formData.shippingPostalCode : formData.postalCode,
        shipping_country: formData.hasDifferentShippingAddress ? formData.shippingCountry : formData.country,
        client_vat_number: formData.vatNumber,
        client_is_vat_exempt: formData.isVatExempt
      };
      
      // Soumettre la demande
      const response = await createProductRequest(requestData);
      console.log("Réponse de la demande:", response);
      
      // Succès
      setIsSuccess(true);
      clearCart();
      
      // Attendre 2 secondes avant de rediriger
      setTimeout(() => {
        navigate('/client/requests');
      }, 2000);
      
    } catch (error) {
      console.error("Erreur lors de la soumission de la demande:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la soumission de votre demande. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Afficher la page de succès
  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Demande envoyée avec succès</h2>
          <p className="text-gray-600 mb-6">
            Votre demande a été enregistrée. Nous vous contacterons dans les plus brefs délais.
          </p>
          <Button asChild>
            <Link to="/client/requests">Voir mes demandes</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Finaliser ma demande</h1>
        <Link to="/panier">
          <Button variant="outline" size="sm" className="flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour au panier
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Vos coordonnées</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nom complet *</Label>
                <Input 
                  id="clientName" 
                  name="clientName" 
                  value={formData.clientName}
                  onChange={handleChange}
                  required
                  placeholder="Prénom et nom"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="exemple@entreprise.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Entreprise *</Label>
                <Input 
                  id="company" 
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  placeholder="Nom de votre entreprise"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input 
                  id="phone" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vatNumber">Numéro de TVA</Label>
                <Input 
                  id="vatNumber" 
                  name="vatNumber"
                  value={formData.vatNumber}
                  onChange={handleChange}
                  placeholder="FR12345678900"
                />
              </div>
              
              <div className="flex items-center space-x-2 h-full pt-8">
                <Checkbox 
                  id="isVatExempt" 
                  checked={formData.isVatExempt}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('isVatExempt', checked as boolean)
                  }
                />
                <label 
                  htmlFor="isVatExempt" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Exonération de TVA
                </label>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mt-6">Adresse de facturation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse *</Label>
                <Input 
                  id="address" 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="123 Rue Exemple"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Input 
                  id="city" 
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="Paris"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal *</Label>
                <Input 
                  id="postalCode" 
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                  placeholder="75000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Pays *</Label>
                <Input 
                  id="country" 
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  placeholder="France"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="hasDifferentShippingAddress" 
                checked={formData.hasDifferentShippingAddress}
                onCheckedChange={(checked) => 
                  handleCheckboxChange('hasDifferentShippingAddress', checked as boolean)
                }
              />
              <label 
                htmlFor="hasDifferentShippingAddress" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Adresse de livraison différente
              </label>
            </div>
            
            {formData.hasDifferentShippingAddress && (
              <>
                <h3 className="text-lg font-medium mt-6">Adresse de livraison</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingAddress">Adresse *</Label>
                    <Input 
                      id="shippingAddress" 
                      name="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={handleChange}
                      required={formData.hasDifferentShippingAddress}
                      placeholder="123 Rue Exemple"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shippingCity">Ville *</Label>
                    <Input 
                      id="shippingCity" 
                      name="shippingCity"
                      value={formData.shippingCity}
                      onChange={handleChange}
                      required={formData.hasDifferentShippingAddress}
                      placeholder="Paris"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shippingPostalCode">Code postal *</Label>
                    <Input 
                      id="shippingPostalCode" 
                      name="shippingPostalCode"
                      value={formData.shippingPostalCode}
                      onChange={handleChange}
                      required={formData.hasDifferentShippingAddress}
                      placeholder="75000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shippingCountry">Pays *</Label>
                    <Input 
                      id="shippingCountry" 
                      name="shippingCountry"
                      value={formData.shippingCountry}
                      onChange={handleChange}
                      required={formData.hasDifferentShippingAddress}
                      placeholder="France"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea 
                id="message" 
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Informations complémentaires pour votre demande..."
                rows={4}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                "Soumettre ma demande"
              )}
            </Button>
          </form>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Récapitulatif</h2>
              
              <div className="space-y-4 mb-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-12 h-12 bg-gray-50 rounded flex-shrink-0">
                      <img 
                        src={item.product.image_url || "/placeholder.svg"} 
                        alt={item.product.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Qté: {item.quantity}</span>
                        <span>{formatCurrency(item.product.monthly_price * item.quantity)}/mois</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total mensuel:</span>
                  <span className="text-blue-600">{formatCurrency(cartTotal)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Prix HT pour une durée de 36 mois. Engagement ferme.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewRequestPage;

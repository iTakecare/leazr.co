
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, Mail, Phone, Send, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CartItem as CartItemType } from '@/types/cart';

interface RequestSummaryProps {
  formData: {
    company: string;
    vat_number: string;
    name: string;
    email: string;
    phone: string;
    message: string;
  };
  cartItems: CartItemType[];
  cartTotal: number;
  loading: boolean;
  onPrev: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const RequestSummary: React.FC<RequestSummaryProps> = ({
  formData,
  cartItems,
  cartTotal,
  loading,
  onPrev,
  onSubmit
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Récapitulatif de votre demande</h2>
        <p className="text-gray-600">Veuillez vérifier les informations avant de soumettre votre demande</p>
      </div>

      {/* Company Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Informations de l'entreprise</h3>
        <div className="space-y-2">
          <div className="flex items-start">
            <Building className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">{formData.company}</p>
              <p className="text-sm text-gray-600">TVA: {formData.vat_number}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Informations de contact</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-500 mr-2" />
            <p>{formData.name}</p>
          </div>
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-500 mr-2" />
            <p>{formData.email}</p>
          </div>
          {formData.phone && (
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-500 mr-2" />
              <p>{formData.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Détails de la commande</h3>
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.product.id} className="flex justify-between">
              <div>
                <p>{item.quantity}x {item.product.name}</p>
                <p className="text-sm text-gray-600">{formatCurrency(item.product.monthly_price)} HT/mois par unité</p>
              </div>
              <p className="font-medium">
                {formatCurrency(item.product.monthly_price * item.quantity)} HT/mois
              </p>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex justify-between font-medium">
            <p>Total mensuel</p>
            <p className="text-[#2d618f]">{formatCurrency(cartTotal)} HT/mois</p>
          </div>
        </div>
      </div>

      {/* Message Section */}
      <div>
        <div className="space-y-2">
          <Label htmlFor="finalMessage">Message (optionnel)</Label>
          <Textarea
            id="finalMessage"
            value={formData.message}
            onChange={(e) => {}}
            placeholder="Aucun message"
            rows={3}
            readOnly
            className="bg-gray-50"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrev}
          disabled={loading}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        
        <Button 
          onClick={onSubmit} 
          disabled={loading}
          className="min-w-[180px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Envoyer ma demande
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default RequestSummary;

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompanyBranding } from '@/services/companyCustomizationService';

const PublicRequestPage = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Configuration par défaut du branding
  const defaultBranding: CompanyBranding = {
    company_id: '',
    primary_color: '#3b82f6',
    secondary_color: '#64748b',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation simple
    if (!name || !email || !terms) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires et accepter les conditions.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Simuler l'envoi de la demande
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simuler un délai d'attente
      toast({
        title: "Demande envoyée",
        description: "Votre demande a été envoyée avec succès. Nous vous contacterons bientôt.",
      });
      // Réinitialiser le formulaire
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setProductCategory('');
      setProductName('');
      setQuantity('');
      setDeliveryDate(undefined);
      setMessage('');
      setTerms(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'envoi de votre demande. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Demande d'informations</CardTitle>
          <CardDescription>
            Remplissez le formulaire ci-dessous pour demander des informations sur nos produits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="company">Entreprise</Label>
              <Input
                type="text"
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="productCategory">Catégorie de produit</Label>
              <Select onValueChange={setProductCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category1">Catégorie 1</SelectItem>
                  <SelectItem value="category2">Catégorie 2</SelectItem>
                  <SelectItem value="category3">Catégorie 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="productName">Nom du produit</Label>
              <Input
                type="text"
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>Date de livraison souhaitée</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? format(deliveryDate, "PPP") : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deliveryDate}
                    onSelect={setDeliveryDate}
                    disabled={(date) =>
                      date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={terms}
                onCheckedChange={(checked) => setTerms(!!checked)}
                required
              />
              <Label htmlFor="terms">
                J'accepte les <a href="#" className="text-blue-500">conditions générales</a> *
              </Label>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Envoi en cours..." : "Envoyer la demande"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicRequestPage;

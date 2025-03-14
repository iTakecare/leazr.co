
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Package, Send, ShoppingCart, Search, Plus, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { getClientIdForUser } from "@/utils/clientUserAssociation";
import { supabase } from "@/integrations/supabase/client";

// Définition du schéma de validation pour le formulaire
const requestFormSchema = z.object({
  description: z.string().min(10, {
    message: "La description doit comporter au moins 10 caractères.",
  }),
  additional_info: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

const ClientEquipmentRequestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Configuration du formulaire avec React Hook Form
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      description: "",
      additional_info: "",
    },
  });

  // Récupérer l'ID client associé à l'utilisateur
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;
      
      try {
        const id = await getClientIdForUser(user.id, user.email || null);
        console.log("Client ID found:", id);
        setClientId(id);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'ID client:", error);
        toast.error("Impossible de récupérer les informations du client");
      }
    };
    
    fetchClientId();
  }, [user]);

  // Charger les produits du catalogue
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('name');
        
        if (error) throw error;
        console.log("Products loaded:", data.length);
        setProducts(data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des produits:", error);
        toast.error("Impossible de charger le catalogue de produits");
      }
    };
    
    fetchProducts();
  }, []);

  // Filtrer les produits en fonction du terme de recherche
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Ajouter un produit à la sélection
  const addProduct = (product) => {
    const existingProduct = selectedProducts.find(p => p.id === product.id);
    
    if (existingProduct) {
      // Mettre à jour la quantité si le produit existe déjà
      setSelectedProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      // Ajouter le nouveau produit avec une quantité de 1
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
    
    // Mettre à jour le montant total
    setTotalAmount(prev => prev + product.price);
    
    toast.success(`${product.name} ajouté à votre demande`);
  };

  // Modifier la quantité d'un produit sélectionné
  const updateProductQuantity = (productId, change) => {
    setSelectedProducts(prevProducts => {
      const updatedProducts = prevProducts.map(p => {
        if (p.id === productId) {
          const newQuantity = Math.max(0, p.quantity + change);
          // Mettre à jour le montant total
          setTotalAmount(prev => prev + (change * p.price));
          return { ...p, quantity: newQuantity };
        }
        return p;
      });
      
      // Filtrer les produits avec une quantité de 0
      return updatedProducts.filter(p => p.quantity > 0);
    });
  };

  // Supprimer un produit de la sélection
  const removeProduct = (product) => {
    setSelectedProducts(prevProducts => 
      prevProducts.filter(p => p.id !== product.id)
    );
    
    // Mettre à jour le montant total
    setTotalAmount(prev => prev - (product.price * product.quantity));
    
    toast.info(`${product.name} retiré de votre demande`);
  };

  // Soumettre la demande d'équipement
  const onSubmit = async (values: RequestFormValues) => {
    if (selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }
    
    if (!clientId) {
      toast.error("Impossible de récupérer l'ID client");
      return;
    }
    
    setLoading(true);
    
    try {
      // Préparer les données de la demande
      const equipmentDescription = selectedProducts.map(p => 
        `${p.name} (x${p.quantity}) - ${formatCurrency(p.price * p.quantity)}`
      ).join("\n");
      
      const detailedDescription = `${values.description}\n\n${equipmentDescription}`;
      
      // Calculer le montant total et le paiement mensuel (exemple simple)
      const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const monthlyPayment = totalAmount / 24; // Exemple simple: financement sur 24 mois
      
      // Créer la demande dans la base de données
      const { data, error } = await supabase
        .from('offers')
        .insert([
          {
            client_id: clientId,
            client_name: user?.company || `${user?.first_name || ''} ${user?.last_name || ''}`,
            client_email: user?.email,
            equipment_description: detailedDescription,
            additional_info: values.additional_info,
            amount: totalAmount,
            monthly_payment: monthlyPayment,
            coefficient: 0.04, // Exemple de coefficient
            status: 'pending',
            workflow_status: 'client_waiting',
            user_id: user?.id
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Votre demande a été envoyée avec succès");
      navigate('/client/requests');
      
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      toast.error("Impossible d'envoyer votre demande");
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="w-full p-6">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold">Demande d'équipement</h1>
          <p className="text-muted-foreground">
            Sélectionnez les équipements souhaités et soumettez votre demande
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalogue de produits */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Catalogue d'équipements</CardTitle>
                <CardDescription>
                  Recherchez et sélectionnez les équipements que vous souhaitez demander
                </CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Rechercher un équipement..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <Card key={product.id} className="overflow-hidden border">
                        <div className="flex justify-between items-center p-3">
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.brand && `${product.brand} • `}
                              {product.category}
                            </p>
                            <p className="font-bold mt-1 text-primary">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => addProduct(product)} className="flex items-center gap-1">
                            <Plus className="h-4 w-4" />
                            Ajouter
                          </Button>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                      <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-lg font-medium">Aucun produit trouvé</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Essayez avec un autre terme de recherche
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Formulaire de demande */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Votre demande</CardTitle>
                <CardDescription>
                  {selectedProducts.length === 0 
                    ? "Ajoutez des équipements depuis le catalogue" 
                    : `${selectedProducts.length} équipement(s) sélectionné(s)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProducts.length > 0 ? (
                  <div className="space-y-3">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex justify-between items-center p-2 border rounded-md">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{product.name}</h4>
                          <p className="text-primary text-sm font-bold">
                            {formatCurrency(product.price * product.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-6 w-6" 
                            onClick={() => updateProductQuantity(product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center">{product.quantity}</span>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-6 w-6"
                            onClick={() => updateProductQuantity(product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeProduct(product)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between font-bold">
                        <span>Montant total</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>Estimation mensuelle (24 mois)</span>
                        <span>{formatCurrency(totalAmount / 24)}/mois</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-lg font-medium">Panier vide</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ajoutez des équipements depuis le catalogue
                    </p>
                  </div>
                )}
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description de votre besoin</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Décrivez votre besoin en matériel..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Expliquez pourquoi vous avez besoin de ces équipements
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="additional_info"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Informations complémentaires (optionnel)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Informations complémentaires..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || selectedProducts.length === 0}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Envoyer la demande
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientEquipmentRequestPage;

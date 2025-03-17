
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClientForAmbassador } from "@/services/ambassadorService";

const AmbassadorCreateClient = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("France");
  const [vatNumber, setVatNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    if (!user?.ambassador_id) {
      toast.error("Vous devez être connecté en tant qu'ambassadeur pour créer un client");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const clientData = {
        name,
        email,
        company,
        phone,
        address,
        city,
        postal_code: postalCode,
        country,
        vat_number: vatNumber,
        notes,
        ambassador_id: user.ambassador_id
      };
      
      // Pass user object as second parameter to match the expected function signature
      const result = await createClientForAmbassador(clientData, user);
      
      if (result) {
        toast.success("Client créé avec succès !");
        navigate("/ambassador/clients");
      } else {
        throw new Error("Échec de la création du client");
      }
    } catch (error) {
      console.error("Erreur lors de la création du client:", error);
      toast.error("Une erreur s'est produite lors de la création du client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <h1 className="text-2xl font-bold mb-6">Créer un nouveau client</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Informations du client</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom <span className="text-red-500">*</span></Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Nom du client" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="email@exemple.com" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Entreprise</Label>
                    <Input 
                      id="company" 
                      value={company} 
                      onChange={(e) => setCompany(e.target.value)} 
                      placeholder="Nom de l'entreprise" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="01 23 45 67 89" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input 
                      id="address" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="123 rue exemple" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input 
                      id="city" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                      placeholder="Paris" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input 
                      id="postalCode" 
                      value={postalCode} 
                      onChange={(e) => setPostalCode(e.target.value)} 
                      placeholder="75000" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input 
                      id="country" 
                      value={country} 
                      onChange={(e) => setCountry(e.target.value)} 
                      placeholder="France" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">Numéro TVA</Label>
                    <Input 
                      id="vatNumber" 
                      value={vatNumber} 
                      onChange={(e) => setVatNumber(e.target.value)} 
                      placeholder="FR12345678901" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Informations supplémentaires..." 
                    className="h-24"
                  />
                </div>
                
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/ambassador/dashboard")}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Création en cours..." : "Créer le client"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCreateClient;

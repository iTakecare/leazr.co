
import React, { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Building2, Mail, Plus, Loader2 } from "lucide-react";
import { getClients, createClient } from "@/services/clientService";
import { Client, CreateClientData } from "@/types/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ClientSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: { id: string; name: string; email: string; company: string }) => void;
}

// Schéma de validation pour le formulaire rapide
const quickClientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
});

type QuickClientFormValues = z.infer<typeof quickClientSchema>;

const ClientSelector = ({ isOpen, onClose, onSelectClient }: ClientSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, isAmbassador } = useAuth();
  
  const form = useForm<QuickClientFormValues>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
    },
  });

  useEffect(() => {
    const fetchClients = async () => {
      if (isOpen) {
        setLoading(true);
        try {
          let data;
          
          // Si l'utilisateur est un ambassadeur, charger uniquement ses clients
          if (isAmbassador() && user?.ambassador_id) {
            console.log("Loading ambassador clients for:", user.ambassador_id);
            const { data: ambassadorClients, error: clientsError } = await supabase
              .from("ambassador_clients")
              .select("client_id, clients(*)")
              .eq("ambassador_id", user.ambassador_id);
              
            if (clientsError) {
              console.error("Error loading ambassador clients:", clientsError);
              throw clientsError;
            }
            
            console.log("Ambassador clients data:", ambassadorClients);
            
            // Transformer les données pour obtenir seulement les informations des clients
            data = ambassadorClients.map(item => item.clients);
          } else {
            // Sinon, charger tous les clients (admin)
            data = await getClients();
          }
          
          setClients(data);
        } catch (error) {
          console.error("Error fetching clients:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchClients();
  }, [isOpen, user, isAmbassador]);
  
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const handleSelectClient = (client: Client) => {
    onSelectClient({
      id: client.id,
      name: client.name,
      email: client.email || "",
      company: client.company || ""
    });
    onClose();
  };

  const onSubmit = async (data: QuickClientFormValues) => {
    setSubmitting(true);
    try {
      const clientData: CreateClientData = {
        name: data.name,
        email: data.email || undefined,
        company: data.company || undefined
      };
      
      const newClient = await createClient(clientData);
      if (newClient) {
        toast.success("Client créé avec succès");
        
        // Si l'utilisateur est un ambassadeur, associer le client à l'ambassadeur
        if (isAmbassador() && user?.ambassador_id) {
          try {
            console.log("Associating client to ambassador from selector:", {
              ambassadorId: user.ambassador_id,
              clientId: newClient.id
            });
            
            const { error: linkError } = await supabase
              .from("ambassador_clients")
              .insert({
                ambassador_id: user.ambassador_id,
                client_id: newClient.id
              });
              
            if (linkError) {
              console.error("Erreur lors de l'association du client à l'ambassadeur:", linkError);
              toast.error("Erreur lors de l'association du client à l'ambassadeur");
            } else {
              console.log("Client successfully associated with ambassador from selector");
            }
          } catch (associationError) {
            console.error("Exception lors de l'association du client:", associationError);
            toast.error("Erreur lors de l'association du client à l'ambassadeur");
          }
        }
        
        setClients([...clients, newClient]);
        form.reset();
        setShowForm(false);
        
        // Sélectionner immédiatement le nouveau client
        handleSelectClient(newClient);
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Erreur lors de la création du client");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sélection du client</SheetTitle>
          <SheetDescription>
            Choisissez un client pour votre offre
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {showForm && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Nouveau client</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du client" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Email du client" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Société</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de la société" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForm(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        "Créer"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
          
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary"
                  onClick={() => handleSelectClient(client)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium">{client.name}</h3>
                  </div>
                  <div className="space-y-1 pl-8">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{client.company || "Pas de société"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{client.email || "Pas d'email"}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredClients.length === 0 && !loading && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Aucun client trouvé</p>
                  {!showForm && (
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Créer un client
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClientSelector;


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
import { Search, User, Building2, Mail, Plus, Loader2, RefreshCw } from "lucide-react";
import { getClients, createClient, linkClientToAmbassador } from "@/services/clientService";
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

const quickClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
});

type QuickClientFormValues = z.infer<typeof quickClientSchema>;

const ClientSelector = ({ isOpen, onClose, onSelectClient }: ClientSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user, isAmbassador } = useAuth();
  
  const form = useForm<QuickClientFormValues>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
    },
  });

  const fetchClients = async () => {
    if (isOpen) {
      setLoading(true);
      try {
        let data;
        
        if (isAmbassador() && user?.ambassador_id) {
          console.log("Loading ambassador clients for:", user.ambassador_id);
          const { data: ambassadorClients, error: clientsError } = await supabase
            .from("ambassador_clients")
            .select(`
              id,
              client_id,
              clients (*)
            `)
            .eq("ambassador_id", user.ambassador_id);
            
          if (clientsError) {
            console.error("Error loading ambassador clients:", clientsError);
            throw clientsError;
          }
          
          console.log("Ambassador clients data:", ambassadorClients);
          
          if (ambassadorClients && ambassadorClients.length > 0) {
            data = ambassadorClients
              .filter(item => item.clients) // Filter out any null references
              .map(item => item.clients);
          } else {
            data = [];
          }
        } else {
          data = await getClients();
        }
        
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Error loading clients");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchClients();
  }, [isOpen, user, isAmbassador]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    toast.success("Client list refreshed");
  };
  
  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        toast.success("Client created successfully");
        
        if (isAmbassador() && user?.ambassador_id) {
          try {
            console.log("Ensuring client is linked to ambassador from selector:", {
              ambassadorId: user.ambassador_id,
              clientId: newClient.id
            });
            
            await linkClientToAmbassador(newClient.id, user.ambassador_id);
            console.log("Client successfully associated with ambassador from selector");
            await fetchClients(); // Refresh the client list
          } catch (associationError) {
            console.error("Exception associating client:", associationError);
            toast.error("Error associating client with ambassador");
          }
        } else {
          setClients([...clients, newClient]);
        }
        
        form.reset();
        setShowForm(false);
        
        handleSelectClient(newClient);
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Error creating client");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Client Selection</SheetTitle>
          <SheetDescription>
            Choose a client for your offer
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for a client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {showForm && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">New client</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Client name" {...field} />
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
                          <Input placeholder="Client email" {...field} />
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
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Company name" {...field} />
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
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create"
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
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
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
                        <span>{client.company || "No company"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{client.email || "No email"}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No clients found</p>
                  {!showForm && (
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create a client
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

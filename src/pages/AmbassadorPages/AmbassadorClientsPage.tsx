
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, User, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientsEmptyState } from "@/components/clients/ClientsEmptyState";
import { Skeleton } from "@/components/ui/skeleton";

const AmbassadorClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!user?.ambassador_id) {
      console.error("No ambassador_id found for current user");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching clients for ambassador ID:", user.ambassador_id);
      
      // Use a JOIN query to get both the relationship and client data in one go
      // This ensures we're getting the correct relationships from the ambassador_clients table
      const { data, error: queryError } = await supabase
        .from("ambassador_clients")
        .select(`
          id,
          client_id,
          clients:client_id (*)
        `)
        .eq("ambassador_id", user.ambassador_id);
      
      if (queryError) {
        console.error("Error fetching ambassador clients:", queryError);
        throw queryError;
      }
      
      console.log("Fetched ambassador-client data:", data);
      
      if (!data || data.length === 0) {
        console.log("No clients found for this ambassador");
        setClients([]);
        setFilteredClients([]);
        setLoading(false);
        return;
      }
      
      // Process the joined data to extract client information
      const processedClients = data.map(item => {
        if (!item.clients) {
          console.error(`Missing client data for association ${item.id}, client_id: ${item.client_id}`);
          return null;
        }
        return {
          ...item.clients,
          ambassador_client_id: item.id
        };
      }).filter(client => client !== null);
      
      console.log("Processed clients:", processedClients);
      
      setClients(processedClients);
      setFilteredClients(processedClients);
    } catch (err) {
      console.error("Error loading clients:", err);
      setError("Unable to load clients");
      toast.error("Error loading clients");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.ambassador_id]);
  
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);
  
  // Client filtering
  useEffect(() => {
    if (!clients.length) return;
    
    if (searchTerm) {
      const filtered = clients.filter(client => 
        (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);
  
  const handleCreateOffer = (clientId) => {
    navigate(`/ambassador/create-offer/${clientId}`);
  };
  
  const handleAddClient = () => {
    navigate("/clients/create");
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    toast.success("Client list refreshed");
  };
  
  const renderClientCards = () => {
    if (filteredClients.length === 0) {
      return (
        <div className="text-center p-10">
          <User className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-muted-foreground">No clients found</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{client.name}</h3>
                <p className="text-sm text-muted-foreground">{client.email}</p>
                {client.company && (
                  <p className="text-sm">{client.company}</p>
                )}
              </div>
              <Button size="sm" onClick={() => handleCreateOffer(client.id)}>
                <Plus className="h-4 w-4 mr-1" /> Offer
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderClientTable = () => {
    return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell>{client.company || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleCreateOffer(client.id)}>
                      <Plus className="h-4 w-4 mr-1" /> Create offer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <ClientsEmptyState />
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading && !refreshing) {
    return (
      <PageTransition>
        <Container>
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="p-4 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Clients</h1>
              <p className="text-muted-foreground">
                Manage clients you've brought in
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button onClick={handleAddClient}>
                <Plus className="mr-2 h-4 w-4" />
                Add a client
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a client..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {error ? (
            <div className="text-center p-10">
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={handleRefresh}>
                Try again
              </Button>
            </div>
          ) : (
            isMobile ? renderClientCards() : renderClientTable()
          )}
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorClientsPage;

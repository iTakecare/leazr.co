
import React, { useState, useEffect } from "react";
import { useOffers } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Grid, List, Filter, Search } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import OffersKanban from "@/components/offers/OffersKanban";
import OffersTable from "@/components/offers/OffersTable";
import OffersHeader from "@/components/offers/OffersHeader";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/layout/Container";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AmbassadorOffersPage = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [error, setError] = useState(null);
  
  // Chargement des offres
  useEffect(() => {
    const loadAmbassadorOffers = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'ambassador_offer')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setOffers(data || []);
        setFilteredOffers(data || []);
      } catch (err) {
        console.error("Erreur lors du chargement des offres:", err);
        setError("Impossible de charger les offres");
        toast.error("Erreur lors du chargement des offres");
      } finally {
        setLoading(false);
      }
    };
    
    loadAmbassadorOffers();
  }, [user?.id]);
  
  // Filtrage des offres
  useEffect(() => {
    if (!offers.length) return;
    
    let filtered = [...offers];
    
    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(offer => 
        offer.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.equipment_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtre par statut
    if (activeTab !== 'all') {
      filtered = filtered.filter(offer => offer.workflow_status === activeTab);
    }
    
    setFilteredOffers(filtered);
  }, [searchTerm, activeTab, activeType, offers]);
  
  // Gestion de la suppression d'une offre
  const handleDeleteOffer = async (id) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette offre ?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id); // Sécurité supplémentaire
        
      if (error) throw error;
      
      setOffers(offers.filter(offer => offer.id !== id));
      toast.success("Offre supprimée avec succès");
    } catch (err) {
      console.error("Erreur lors de la suppression de l'offre:", err);
      toast.error("Impossible de supprimer l'offre");
    }
  };
  
  // Gestion du changement de statut (limité pour les ambassadeurs)
  const handleUpdateWorkflowStatus = async (offerId, newStatus) => {
    // Pour les ambassadeurs, on ne permet que le passage de draft à sent
    if (newStatus !== 'sent') {
      toast.error("Vous n'avez pas les droits pour effectuer cette action");
      return;
    }
    
    try {
      const offerToUpdate = offers.find(offer => offer.id === offerId);
      if (!offerToUpdate || offerToUpdate.workflow_status !== 'draft') {
        toast.error("Vous ne pouvez envoyer que des offres en brouillon");
        return;
      }
      
      const { error } = await supabase
        .from('offers')
        .update({ workflow_status: newStatus })
        .eq('id', offerId)
        .eq('user_id', user?.id); // Sécurité supplémentaire
        
      if (error) throw error;
      
      // Mettre à jour l'état local
      setOffers(offers.map(offer => 
        offer.id === offerId 
          ? { ...offer, workflow_status: newStatus } 
          : offer
      ));
      
      toast.success("Offre envoyée au client avec succès");
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      toast.error("Impossible de mettre à jour le statut de l'offre");
    }
  };
  
  // Fonction factice pour le téléchargement du PDF (à implémenter)
  const handleDownloadPdf = (id) => {
    toast.info("Téléchargement du PDF en cours de développement");
  };
  
  // Fonction factice pour renvoyer l'offre (à implémenter)
  const handleResendOffer = (id) => {
    toast.info("Renvoi de l'offre en cours de développement");
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <OffersLoading />
        </Container>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Container>
          <OffersError message={error} onRetry={() => window.location.reload()} />
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="w-full p-4 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Gestion des offres</h1>
              <p className="text-muted-foreground">
                Gérez vos offres clients
              </p>
            </div>
            <Button asChild>
              <Link to="/ambassador/create-offer" className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle offre
              </Link>
            </Button>
          </div>
          
          <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
            <OffersFilter 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              activeType={activeType}
              onTypeChange={setActiveType}
            />
            
            <div className="flex items-center gap-2">
              <OffersSearch value={searchTerm} onChange={setSearchTerm} />
              
              {/* Sélecteur de vue */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('list')} 
                  className="rounded-none px-3"
                >
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
                <Button 
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('kanban')} 
                  className="rounded-none px-3"
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
              </div>
            </div>
          </div>
          
          {viewMode === 'kanban' ? (
            <OffersKanban
              offers={filteredOffers}
              onStatusChange={handleUpdateWorkflowStatus}
              isUpdatingStatus={false}
              onDeleteOffer={handleDeleteOffer}
              includeConverted={true}
            />
          ) : (
            <OffersTable 
              offers={filteredOffers} 
              onStatusChange={handleUpdateWorkflowStatus}
              onDeleteOffer={handleDeleteOffer}
              onResendOffer={handleResendOffer}
              onDownloadPdf={handleDownloadPdf}
              isUpdatingStatus={false}
            />
          )}
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorOffersPage;

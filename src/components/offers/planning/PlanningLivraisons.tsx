import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, User, Building, Download, Filter, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addDays, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface DeliveryItem {
  id: string;
  title: string;
  quantity: number;
  delivery_type: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  delivery_date?: string;
  collaborator_name?: string;
  site_name?: string;
  delivery_address?: string;
  delivery_city?: string;
  client_name: string;
  offer_id: string;
  status: 'planned' | 'in_transit' | 'delivered' | 'delayed';
}

const statusColors = {
  planned: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  delayed: 'bg-red-100 text-red-800'
};

const statusLabels = {
  planned: 'Planifiée',
  in_transit: 'En transit',
  delivered: 'Livrée',
  delayed: 'Retardée'
};

const PlanningLivraisons: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [regions, setRegions] = useState<string[]>([]);

  // Charger les données de livraison
  const fetchDeliveries = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('offer_equipment')
        .select(`
          id,
          title,
          quantity,
          delivery_type,
          delivery_address,
          delivery_city,
          delivery_postal_code,
          offer:offers!offer_equipment_offer_id_fkey(
            id,
            client_name:clients(name)
          ),
          collaborator:collaborators(name),
          delivery_site:client_delivery_sites(site_name, city)
        `)
        .not('delivery_type', 'is', null);

      if (error) {
        console.error('Erreur lors du chargement des livraisons:', error);
        toast.error('Impossible de charger les données de livraison');
        return;
      }

      // Transformer les données pour le composant
      const transformedDeliveries: DeliveryItem[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        delivery_type: item.delivery_type,
        delivery_date: addDays(new Date(), Math.floor(Math.random() * 30)).toISOString(), // Date simulée
        collaborator_name: item.collaborator?.name,
        site_name: item.delivery_site?.site_name,
        delivery_address: item.delivery_address,
        delivery_city: item.delivery_city,
        client_name: item.offer?.client_name?.name || 'Client inconnu',
        offer_id: item.offer?.id || '',
        status: ['planned', 'in_transit', 'delivered', 'delayed'][Math.floor(Math.random() * 4)] as any
      }));

      setDeliveries(transformedDeliveries);

      // Extraire les régions uniques
      const uniqueRegions = [...new Set(transformedDeliveries.map(d => d.delivery_city).filter(Boolean))];
      setRegions(uniqueRegions);
    } catch (error) {
      console.error('Erreur lors du chargement des livraisons:', error);
      toast.error('Une erreur est survenue lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les livraisons
  const applyFilters = () => {
    let filtered = deliveries;

    // Filtre par semaine
    const weekStart = startOfWeek(currentWeek, { locale: fr });
    const weekEnd = endOfWeek(currentWeek, { locale: fr });

    filtered = filtered.filter(delivery => {
      if (!delivery.delivery_date) return false;
      const deliveryDate = parseISO(delivery.delivery_date);
      return isWithinInterval(deliveryDate, { start: weekStart, end: weekEnd });
    });

    // Filtre par région
    if (filterRegion !== 'all') {
      filtered = filtered.filter(delivery => delivery.delivery_city === filterRegion);
    }

    // Filtre par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(delivery => delivery.status === filterStatus);
    }

    setFilteredDeliveries(filtered);
  };

  // Exporter les données
  const exportDeliveries = () => {
    const csvData = filteredDeliveries.map(delivery => ({
      'Date': delivery.delivery_date ? format(parseISO(delivery.delivery_date), 'dd/MM/yyyy', { locale: fr }) : '',
      'Client': delivery.client_name,
      'Équipement': delivery.title,
      'Quantité': delivery.quantity,
      'Type de livraison': delivery.delivery_type,
      'Destination': getDeliveryDestination(delivery),
      'Statut': statusLabels[delivery.status]
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-livraisons-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
  };

  const getDeliveryDestination = (delivery: DeliveryItem): string => {
    switch (delivery.delivery_type) {
      case 'collaborator':
        return `👤 ${delivery.collaborator_name}`;
      case 'predefined_site':
        return `🏢 ${delivery.site_name}`;
      case 'specific_address':
        return `📍 ${delivery.delivery_address}, ${delivery.delivery_city}`;
      default:
        return '🏠 Client principal';
    }
  };

  const getDeliveryIcon = (type: string) => {
    switch (type) {
      case 'collaborator': return <User className="w-4 h-4" />;
      case 'predefined_site': return <Building className="w-4 h-4" />;
      case 'specific_address': return <MapPin className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deliveries, currentWeek, filterRegion, filterStatus]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    return addDays(startOfWeek(currentWeek, { locale: fr }), i);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planning des livraisons</h1>
          <p className="text-muted-foreground">
            Semaine du {format(startOfWeek(currentWeek, { locale: fr }), 'dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={filterRegion} onValueChange={setFilterRegion}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Toutes les régions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les régions</SelectItem>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportDeliveries} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Navigation semaine */}
      <div className="flex items-center justify-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
        >
          ← Semaine précédente
        </Button>
        <Button 
          variant="outline"
          onClick={() => setCurrentWeek(new Date())}
        >
          Cette semaine
        </Button>
        <Button 
          variant="outline"
          onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
        >
          Semaine suivante →
        </Button>
      </div>

      {/* Vue calendrier hebdomadaire */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map(day => {
          const dayDeliveries = filteredDeliveries.filter(delivery => {
            if (!delivery.delivery_date) return false;
            const deliveryDate = parseISO(delivery.delivery_date);
            return format(deliveryDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          });

          return (
            <Card key={day.toISOString()} className="min-h-[200px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {format(day, 'EEE dd/MM', { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayDeliveries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune livraison</p>
                ) : (
                  dayDeliveries.map(delivery => (
                    <div 
                      key={delivery.id}
                      className="p-2 border rounded-md bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        {getDeliveryIcon(delivery.delivery_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{delivery.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {delivery.client_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getDeliveryDestination(delivery)}
                          </p>
                          <Badge variant="secondary" className={`text-xs ${statusColors[delivery.status]} mt-1`}>
                            {statusLabels[delivery.status]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Résumé des métriques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Planifiées</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredDeliveries.filter(d => d.status === 'planned').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">En transit</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredDeliveries.filter(d => d.status === 'in_transit').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Livrées</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredDeliveries.filter(d => d.status === 'delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Retardées</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredDeliveries.filter(d => d.status === 'delayed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlanningLivraisons;
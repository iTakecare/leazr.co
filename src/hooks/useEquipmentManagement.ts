
import { useState, useEffect } from 'react';
import { Equipment, EquipmentStatus } from '@/types/equipment';
import { getEquipmentByClientId, updateEquipment } from '@/services/equipmentService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { getClientIdForUser } from '@/utils/clientUserAssociation';

export interface FilterOption {
  id: string;
  label: string;
  checked: boolean;
}

export function useEquipmentManagement() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('vos-appareils');
  
  // Filters
  const [statusFilters, setStatusFilters] = useState<FilterOption[]>([
    { id: 'en-service', label: 'En service', checked: false },
    { id: 'en-reserve', label: 'En réserve', checked: false },
    { id: 'remplacement', label: 'Remplacement', checked: false },
  ]);

  const [locationFilters, setLocationFilters] = useState<FilterOption[]>([
    { id: 'marseille', label: 'Marseille', checked: false },
    { id: 'paris', label: 'Paris', checked: false },
    { id: 'lyon', label: 'Lyon', checked: false },
  ]);

  // Calculate active filters count
  const activeFiltersCount = [...statusFilters, ...locationFilters].filter(f => f.checked).length;

  useEffect(() => {
    const loadClientId = async () => {
      if (!user?.id) return;
      
      try {
        const id = await getClientIdForUser(user.id, user.email || null);
        if (id) {
          setClientId(id);
        } else {
          setError("Impossible de trouver l'ID client associé à cet utilisateur");
        }
      } catch (err) {
        console.error("Error fetching client ID:", err);
        setError("Erreur lors de la récupération de l'ID client");
      }
    };
    
    loadClientId();
  }, [user]);

  useEffect(() => {
    const fetchEquipment = async () => {
      if (!clientId) return;
      
      setLoading(true);
      try {
        // Let's use dummy data for now since we don't have an actual DB table yet
        const mockEquipment: Equipment[] = [
          {
            id: "1",
            title: "MacBook Air 13\" M3",
            purchasePrice: 1299,
            quantity: 1,
            margin: 20,
            assignedTo: "Mathieu Vergnes",
            role: "Developer",
            status: "En service",
            serial: "C02G268KQ6L2",
            image: "/lovable-uploads/2eb6c7df-ba32-4890-8b16-1e5934545637.png",
            type: "laptop",
            supplier: "Apple",
            contractStart: "2022-12-01",
            contractEnd: "2025-11-01",
            contractDuration: "36 mois",
            monthlyRent: 49.90,
            contractNumber: "145142",
            location: "Marseille"
          },
          {
            id: "2",
            title: "iPhone 15 Pro Max",
            purchasePrice: 1199,
            quantity: 1,
            margin: 15,
            assignedTo: "Valentin Vergnes",
            status: "En service",
            serial: "G0NP9LL/A",
            type: "smartphone",
            supplier: "Apple",
            location: "Paris"
          },
          {
            id: "3",
            title: "Galaxy Tab S8",
            purchasePrice: 699,
            quantity: 1,
            margin: 15,
            assignedTo: "Benjamin Tollet",
            status: "En service",
            serial: "R92N20BD69M"
          },
          {
            id: "4",
            title: "AirPods Max",
            purchasePrice: 549,
            quantity: 1,
            margin: 10,
            assignedTo: "Marie-Sarah Denis",
            status: "En service",
            serial: "GU9L2LL/A"
          },
          {
            id: "5",
            title: "Dell SE2422HX",
            purchasePrice: 149,
            quantity: 1,
            margin: 5,
            status: "En réserve",
            serial: "CN03J8R7"
          },
          {
            id: "6",
            title: "MacBook Pro 14\" M1 2022",
            purchasePrice: 1999,
            quantity: 1,
            margin: 20,
            assignedTo: "Thibaud Martin",
            status: "Remplacement",
            serial: "C02F268KQ6L2"
          },
          {
            id: "7",
            title: "Logitech MX Master 2S",
            purchasePrice: 99,
            quantity: 1,
            margin: 5,
            assignedTo: "Mathieu Vergnes",
            status: "En service",
            serial: "2012BG043781"
          },
          {
            id: "8",
            title: "Samsung Galaxy A55",
            purchasePrice: 459,
            quantity: 1,
            margin: 10,
            assignedTo: "Fabien Minet",
            status: "En service",
            serial: "R58N40MZ87V"
          }
        ];

        // In a real implementation, fetch from DB:
        // const data = await getEquipmentByClientId(clientId);
        
        setEquipment(mockEquipment);
        setFilteredEquipment(mockEquipment);
      } catch (err) {
        console.error("Error fetching equipment:", err);
        setError("Erreur lors du chargement des équipements");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEquipment();
  }, [clientId]);

  // Apply filters whenever filter states change
  useEffect(() => {
    if (!equipment.length) return;

    let filtered = [...equipment];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.assignedTo?.toLowerCase().includes(query) ||
        item.serial?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filters
    const activeStatusFilters = statusFilters.filter(f => f.checked).map(f => f.label);
    if (activeStatusFilters.length > 0) {
      filtered = filtered.filter(item => {
        // Map filter IDs to actual status values
        const statusMap: Record<string, string> = {
          'en-service': 'En service',
          'en-reserve': 'En réserve',
          'remplacement': 'Remplacement',
        };
        
        // Find the corresponding status filter
        const matchingFilter = statusFilters.find(f => f.checked && statusMap[f.id] === item.status);
        return !!matchingFilter;
      });
    }
    
    // Apply location filters
    const activeLocationFilters = locationFilters.filter(f => f.checked).map(f => f.label);
    if (activeLocationFilters.length > 0) {
      filtered = filtered.filter(item => activeLocationFilters.includes(item.location || ''));
    }
    
    setFilteredEquipment(filtered);
  }, [equipment, searchQuery, statusFilters, locationFilters]);

  // When equipment is selected
  useEffect(() => {
    if (selectedEquipmentId) {
      const selected = equipment.find(item => item.id === selectedEquipmentId) || null;
      setSelectedEquipment(selected);
    } else {
      setSelectedEquipment(null);
    }
  }, [selectedEquipmentId, equipment]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleStatusFilterChange = (id: string) => {
    setStatusFilters(prevFilters => prevFilters.map(filter => 
      filter.id === id ? { ...filter, checked: !filter.checked } : filter
    ));
  };

  const handleLocationFilterChange = (id: string) => {
    setLocationFilters(prevFilters => prevFilters.map(filter => 
      filter.id === id ? { ...filter, checked: !filter.checked } : filter
    ));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilters(prevFilters => prevFilters.map(filter => ({ ...filter, checked: false })));
    setLocationFilters(prevFilters => prevFilters.map(filter => ({ ...filter, checked: false })));
  };

  const selectEquipment = (equipment: Equipment) => {
    setSelectedEquipmentId(equipment.id);
  };

  const saveEquipment = async (updatedEquipment: Equipment) => {
    try {
      // In a real implementation, save to DB:
      // const savedEquipment = await updateEquipment(updatedEquipment);
      
      // For this mock, just update the local state
      setEquipment(prevEquipment => 
        prevEquipment.map(item => 
          item.id === updatedEquipment.id ? updatedEquipment : item
        )
      );
      
      toast.success("Équipement mis à jour avec succès");
      return true;
    } catch (err) {
      console.error("Error saving equipment:", err);
      toast.error("Erreur lors de la sauvegarde de l'équipement");
      return false;
    }
  };

  return {
    equipment: filteredEquipment,
    loading,
    error,
    selectedEquipmentId,
    selectedEquipment,
    searchQuery,
    activeTab,
    statusFilters,
    locationFilters,
    activeFiltersCount,
    setActiveTab,
    selectEquipment,
    saveEquipment,
    handleSearchChange,
    handleStatusFilterChange,
    handleLocationFilterChange,
    clearFilters
  };
}

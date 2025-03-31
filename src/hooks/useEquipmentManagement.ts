
import { useState, useEffect } from 'react';
import { Equipment } from '@/types/equipment';
import { getEquipmentByClientId } from '@/services/equipmentService';
import { useAuth } from '@/context/AuthContext';

export const useEquipmentManagement = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('vos-appareils');

  // Filter states
  const [statusFilters, setStatusFilters] = useState({
    'En service': false,
    'En réserve': false,
    'Remplacement': false
  });
  const [locationFilters, setLocationFilters] = useState({
    'Bureau': false,
    'Télétravail': false,
    'Client': false,
    'Stock': false
  });

  // Count active filters
  const activeFiltersCount = 
    Object.values(statusFilters).filter(Boolean).length + 
    Object.values(locationFilters).filter(Boolean).length +
    (searchQuery ? 1 : 0);

  // Get client ID from user
  const getClientId = () => {
    if (!user) return null;
    
    // Try to get client ID from localStorage first
    const cachedClientId = user.id ? localStorage.getItem(`client_id_${user.id}`) : null;
    if (cachedClientId) return cachedClientId;
    
    // Fallback to user metadata
    return user.client_id || null;
  };

  // Fetch equipment data
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const clientId = getClientId();
        if (!clientId) {
          setError("Identifiant client non disponible");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        const data = await getEquipmentByClientId(clientId);
        
        // If database is not accessible, use some demo data
        if (!data || data.length === 0) {
          console.log("Using demo equipment data");
          const demoData: Equipment[] = [
            {
              id: '1',
              title: 'MacBook Pro 16"',
              type: 'Ordinateur portable',
              status: 'En service',
              assignedTo: 'John Smith',
              assignedDate: '12/01/2023',
              serial: 'C02G3KZGQ6WN',
              supplier: 'Apple',
              purchasePrice: 2800,
              monthlyRent: 120,
              location: 'Bureau',
              contractStart: '01/01/2023',
              contractEnd: '31/12/2025'
            },
            {
              id: '2',
              title: 'iPhone 15 Pro',
              type: 'Smartphone',
              status: 'En service',
              assignedTo: 'Sarah Connor',
              assignedDate: '15/02/2023',
              serial: 'DNQRZKD9HK88',
              supplier: 'Apple',
              purchasePrice: 1200,
              monthlyRent: 45,
              location: 'Télétravail'
            },
            {
              id: '3',
              title: 'Dell XPS 15',
              type: 'Ordinateur portable',
              status: 'En réserve',
              assignedTo: null,
              serial: 'DL45KD983J',
              supplier: 'Dell',
              purchasePrice: 1850,
              monthlyRent: 80,
              location: 'Stock'
            },
            {
              id: '4',
              title: 'iPad Pro 12.9"',
              type: 'Tablette',
              status: 'Remplacement',
              assignedTo: 'Mike Johnson',
              assignedDate: '23/03/2022',
              serial: 'F8NDJC03Y762',
              supplier: 'Apple',
              purchasePrice: 1100,
              monthlyRent: 40,
              location: 'Client'
            },
          ];
          setEquipment(demoData);
        } else {
          setEquipment(data);
        }

        if (data && data.length > 0) {
          setSelectedEquipmentId(data[0].id);
        }
        
      } catch (error) {
        console.error('Error fetching equipment:', error);
        setError("Une erreur s'est produite lors du chargement des équipements");
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [user]);

  // Filter equipment based on search and filters
  const filteredEquipment = equipment.filter(item => {
    // Search filter
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filters
    const activeStatusFilters = Object.entries(statusFilters).filter(([_, isActive]) => isActive).map(([status]) => status);
    if (activeStatusFilters.length > 0 && item.status && !activeStatusFilters.includes(item.status)) {
      return false;
    }

    // Location filters
    const activeLocationFilters = Object.entries(locationFilters).filter(([_, isActive]) => isActive).map(([location]) => location);
    if (activeLocationFilters.length > 0 && item.location && !activeLocationFilters.includes(item.location)) {
      return false;
    }

    return true;
  });

  // Get selected equipment details
  const selectedEquipment = equipment.find(item => item.id === selectedEquipmentId) || null;

  // Select equipment
  const selectEquipment = (item: Equipment) => {
    setSelectedEquipmentId(item.id);
  };

  // Update equipment
  const saveEquipment = async (updatedEquipment: Equipment) => {
    try {
      // Update the equipment in the local state
      setEquipment(equipment.map(item => 
        item.id === updatedEquipment.id ? updatedEquipment : item
      ));
      
      // Here you would also update the equipment in the database
      // For now, we just log the update
      console.log('Equipment updated:', updatedEquipment);

      return true;
    } catch (error) {
      console.error('Error updating equipment:', error);
      return false;
    }
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: checked
    }));
  };

  // Handle location filter change
  const handleLocationFilterChange = (location: string, checked: boolean) => {
    setLocationFilters(prev => ({
      ...prev,
      [location]: checked
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilters({
      'En service': false,
      'En réserve': false,
      'Remplacement': false
    });
    setLocationFilters({
      'Bureau': false,
      'Télétravail': false,
      'Client': false,
      'Stock': false
    });
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
};

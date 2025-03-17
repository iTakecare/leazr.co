
import { useState, useEffect } from 'react';
import { Leaser } from '@/types/equipment';

export function useLeasers() {
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeasers();
  }, []);

  const fetchLeasers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For now, we'll use mock data
      const mockLeasers: Leaser[] = [
        {
          id: '1',
          name: 'Grenke Finance',
          description: 'Leasing financier spécialisé en équipement informatique',
          ranges: [
            { id: '1-1', min: 0, max: 10000, coefficient: 2.2 },
            { id: '1-2', min: 10001, max: 50000, coefficient: 2.1 },
            { id: '1-3', min: 50001, max: Infinity, coefficient: 2.0 }
          ]
        },
        {
          id: '2',
          name: 'BNP Leasing',
          description: 'Solutions de financement professionnel',
          ranges: [
            { id: '2-1', min: 0, max: 15000, coefficient: 2.3 },
            { id: '2-2', min: 15001, max: 75000, coefficient: 2.15 },
            { id: '2-3', min: 75001, max: Infinity, coefficient: 2.05 }
          ]
        }
      ];
      
      setLeasers(mockLeasers);
    } catch (err) {
      console.error('Error fetching leasers:', err);
      setError('Failed to load leasers');
    } finally {
      setIsLoading(false);
    }
  };

  return { leasers, isLoading, error, fetchLeasers };
}

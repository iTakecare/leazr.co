
import { v4 as uuidv4 } from 'uuid';
import { Leaser } from '@/types/equipment';

// Function to get all leasers
export const getLeasers = async (): Promise<Leaser[]> => {
  try {
    // In a real app, this would fetch from your database
    // For demo purposes, we're returning mock data
    return [
      {
        id: '1',
        name: 'Grenke Finance',
        description: 'Leasing financier spécialisé en équipement informatique',
        logo_url: 'https://example.com/logos/grenke.png',
        ranges: [
          { id: '1-1', min: 0, max: 10000, coefficient: 2.2 },
          { id: '1-2', min: 10001, max: 50000, coefficient: 2.1 },
          { id: '1-3', min: 50001, max: Infinity, coefficient: 2.0 }
        ]
      },
      {
        id: '2',
        name: 'BNP Leasing Solutions',
        description: 'Solutions de financement professionnel',
        logo_url: 'https://example.com/logos/bnp.png',
        ranges: [
          { id: '2-1', min: 0, max: 15000, coefficient: 2.3 },
          { id: '2-2', min: 15001, max: 75000, coefficient: 2.15 },
          { id: '2-3', min: 75001, max: Infinity, coefficient: 2.05 }
        ]
      }
    ];
  } catch (error) {
    console.error('Error fetching leasers:', error);
    throw new Error('Failed to fetch leasers');
  }
};

// Function to add a new leaser
export const addLeaser = async (leaserData: Omit<Leaser, 'id'>): Promise<Leaser> => {
  try {
    // In a real app, this would insert into your database
    const newLeaser: Leaser = {
      id: uuidv4(),
      ...leaserData,
      ranges: leaserData.ranges.map(range => ({
        ...range,
        id: range.id || uuidv4()
      }))
    };
    
    return newLeaser;
  } catch (error) {
    console.error('Error adding leaser:', error);
    throw new Error('Failed to add leaser');
  }
};

// Function to update an existing leaser
export const updateLeaser = async (id: string, leaserData: Omit<Leaser, 'id'>): Promise<boolean> => {
  try {
    // In a real app, this would update your database
    // For demo purposes, we're just returning success
    return true;
  } catch (error) {
    console.error('Error updating leaser:', error);
    throw new Error('Failed to update leaser');
  }
};

// Function to delete a leaser
export const deleteLeaser = async (id: string): Promise<boolean> => {
  try {
    // In a real app, this would delete from your database
    // For demo purposes, we're just returning success
    return true;
  } catch (error) {
    console.error('Error deleting leaser:', error);
    throw new Error('Failed to delete leaser');
  }
};

// Function to insert default leasers if none exist
export const insertDefaultLeasers = async (): Promise<boolean> => {
  try {
    // In a real app, this would check if leasers exist and insert defaults if needed
    // For demo purposes, we're just returning success
    return true;
  } catch (error) {
    console.error('Error inserting default leasers:', error);
    throw new Error('Failed to insert default leasers');
  }
};

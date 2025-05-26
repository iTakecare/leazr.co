
import { assignITakecareSubscription } from './assignITakecareSubscription';

// Initialize iTakecare subscription on app load
export const initializeITakecare = async () => {
  try {
    const result = await assignITakecareSubscription();
    if (result.success) {
      console.log('iTakecare Business subscription initialized successfully');
    } else {
      console.error('Failed to initialize iTakecare subscription:', result.error);
    }
  } catch (error) {
    console.error('Error during iTakecare initialization:', error);
  }
};

// Auto-execute on import
initializeITakecare();


import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const createProductRequest = async (requestData: any) => {
  try {
    console.log("Creating product request:", requestData);
    
    // Create a unique ID for the request
    const requestId = uuidv4();
    
    // Prepare request object with proper format
    const newRequest = {
      id: requestId,
      client_name: requestData.client_name,
      client_email: requestData.client_email,
      client_company: requestData.client_company,
      equipment_description: requestData.equipment_description,
      amount: requestData.amount,
      monthly_payment: requestData.monthly_payment,
      status: 'sent',
      workflow_status: 'client_waiting',
      created_at: new Date().toISOString(),
      type: 'client_request'
    };
    
    // Try to send to supabase first
    try {
      const { error } = await supabase
        .from('offers')
        .insert([newRequest]);
      
      if (error) throw error;
      
      console.log("Request saved to database successfully");
      return { success: true, id: requestId };
    } catch (dbError) {
      console.error("Error saving to database, falling back to localStorage:", dbError);
      
      // Fallback: Store in localStorage if API fails
      const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
      storedRequests.push(newRequest);
      localStorage.setItem('pendingRequests', JSON.stringify(storedRequests));
      
      // Update pending requests count in sidebar
      const pendingCountElement = document.getElementById('pendingRequestsCount');
      if (pendingCountElement) {
        pendingCountElement.textContent = storedRequests.length.toString();
        pendingCountElement.style.display = 'flex';
      }
      
      console.log("Request saved to localStorage");
      return { success: true, id: requestId, localStorage: true };
    }
  } catch (error) {
    console.error("Error creating product request:", error);
    toast.error("Erreur lors de la création de la demande");
    return { success: false, error };
  }
};

export const getAllClientRequests = async () => {
  try {
    // First try to get from database
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('type', 'client_request')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Combine with local storage data
    const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    
    // Merge database and localStorage requests, avoiding duplicates by ID
    const dbRequestIds = new Set(data.map(req => req.id));
    const filteredLocalRequests = storedRequests.filter(req => !dbRequestIds.has(req.id));
    
    return [...data, ...filteredLocalRequests];
  } catch (dbError) {
    console.error("Error fetching from database, falling back to localStorage:", dbError);
    
    // Fallback to localStorage if API fails
    const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    return storedRequests;
  }
};

export const getRequestById = async (requestId) => {
  try {
    // Check localStorage first for pending requests
    const storedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    const localRequest = storedRequests.find(req => req.id === requestId);
    
    if (localRequest) {
      return { data: localRequest, source: 'localStorage' };
    }
    
    // If not in localStorage, try to fetch from database
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (error) throw error;
    
    if (data) {
      return { data, source: 'database' };
    }
    
    return { data: null, error: 'Request not found' };
  } catch (error) {
    console.error("Error fetching request:", error);
    return { data: null, error };
  }
};

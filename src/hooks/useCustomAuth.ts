import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyInfo {
  id: string;
  name: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
}

interface DetectCompanyResponse {
  success: boolean;
  companyId: string;
  company: CompanyInfo;
  detectionMethod: 'provided' | 'domain' | 'default';
}

interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
}

interface PasswordResetData {
  email: string;
  companyId?: string;
}

interface VerifyTokenData {
  token: string;
  newPassword?: string;
}

export const useCustomAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectCompany = async (data?: { 
    origin?: string; 
    email?: string; 
    companyId?: string; 
  }): Promise<DetectCompanyResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: response, error } = await supabase.functions.invoke('detect-company', {
        body: {
          origin: data?.origin || window.location.origin,
          email: data?.email,
          companyId: data?.companyId
        }
      });

      if (error) {
        console.error('Error detecting company:', error);
        setError('Erreur lors de la détection de l\'entreprise');
        return null;
      }

      return response;
    } catch (err) {
      console.error('Error in detectCompany:', err);
      setError('Erreur de connexion');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const customSignup = async (signupData: SignupData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('custom-signup', {
        body: signupData
      });

      if (error) {
        console.error('Error in custom signup:', error);
        setError(error.message || 'Erreur lors de l\'inscription');
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error in customSignup:', err);
      setError('Erreur de connexion');
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  const customPasswordReset = async (resetData: PasswordResetData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('custom-password-reset', {
        body: resetData
      });

      if (error) {
        console.error('Error in custom password reset:', error);
        setError(error.message || 'Erreur lors de la réinitialisation');
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error in customPasswordReset:', err);
      setError('Erreur de connexion');
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (verifyData: VerifyTokenData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('verify-auth-token', {
        body: verifyData
      });

      if (error) {
        console.error('Error in verify token:', error);
        setError(error.message || 'Erreur lors de la vérification');
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error in verifyToken:', err);
      setError('Erreur de connexion');
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  // Regular Supabase auth for login (after account is activated)
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Error in login:', error);
        setError(error.message || 'Erreur de connexion');
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error in login:', err);
      setError('Erreur de connexion');
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error in logout:', error);
        setError(error.message || 'Erreur de déconnexion');
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Error in logout:', err);
      setError('Erreur de connexion');
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    detectCompany,
    customSignup,
    customPasswordReset,
    verifyToken,
    login,
    logout
  };
};
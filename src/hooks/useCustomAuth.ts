import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { SecurityMonitor } from '@/utils/securityMonitor';
import { InputSanitizer } from '@/utils/inputSanitizer';

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
    companyParam?: string;
    companySlug?: string;
  }): Promise<DetectCompanyResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: response, error } = await supabase.functions.invoke('detect-company', {
        body: {
          origin: data?.origin || window.location.origin,
          email: data?.email,
          companyId: data?.companyId,
          companyParam: data?.companyParam,
          companySlug: data?.companySlug
        }
      });

      if (error) {
        Logger.error('Error detecting company', error);
        setError(ErrorHandler.handle(error, 'server'));
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
        Logger.error('Error in custom signup', error);
        const errorMessage = ErrorHandler.handleAuthError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage };
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
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      setLoading(true);
      setError('');

      // Sanitize and validate inputs
      const sanitizedEmail = InputSanitizer.sanitizeEmail(email);
      if (!sanitizedEmail) {
        throw new Error('Invalid email format');
      }

      // Check rate limiting
      if (!SecurityMonitor.checkRateLimit(sanitizedEmail)) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        SecurityMonitor.logSuspiciousActivity('failed_login', { email: sanitizedEmail, error: error.message });
        throw error;
      }

      Logger.security('Successful login', { email: sanitizedEmail });
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = ErrorHandler.handleAuthError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
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
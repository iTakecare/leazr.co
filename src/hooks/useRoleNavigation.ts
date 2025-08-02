import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';

export const useRoleNavigation = () => {
  const navigate = useNavigate();
  const { companySlug } = useParams<{ companySlug: string }>();

  const navigateToAdmin = useCallback((path: string = 'dashboard') => {
    if (!companySlug) {
      console.warn('No company slug available for admin navigation');
      return;
    }
    navigate(`/${companySlug}/admin/${path}`);
  }, [navigate, companySlug]);

  const navigateToClient = useCallback((path: string = 'dashboard') => {
    if (!companySlug) {
      console.warn('No company slug available for client navigation');
      return;
    }
    navigate(`/${companySlug}/client/${path}`);
  }, [navigate, companySlug]);

  const navigateToPartner = useCallback((path: string = 'dashboard') => {
    if (!companySlug) {
      console.warn('No company slug available for partner navigation');
      return;
    }
    navigate(`/${companySlug}/partner/${path}`);
  }, [navigate, companySlug]);

  const navigateToAmbassador = useCallback((path: string = 'dashboard') => {
    if (!companySlug) {
      console.warn('No company slug available for ambassador navigation');
      return;
    }
    navigate(`/${companySlug}/ambassador/${path}`);
  }, [navigate, companySlug]);

  return {
    navigateToAdmin,
    navigateToClient,
    navigateToPartner,
    navigateToAmbassador,
    companySlug
  };
};
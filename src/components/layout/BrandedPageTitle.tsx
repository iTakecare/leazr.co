import { useEffect } from 'react';
import { useSubdomain } from '@/context/SubdomainContext';

interface BrandedPageTitleProps {
  title?: string;
}

export const BrandedPageTitle = ({ title }: BrandedPageTitleProps) => {
  const { detection, isSubdomainDetected } = useSubdomain();

  useEffect(() => {
    const companyName = isSubdomainDetected && detection.company ? detection.company.name : 'Leazr';
    const pageTitle = title ? `${title} - ${companyName}` : companyName;
    
    document.title = pageTitle;
    
    // Update favicon if company has one
    if (isSubdomainDetected && detection.company?.logo_url) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = detection.company.logo_url;
    }
  }, [title, detection, isSubdomainDetected]);

  return null;
};
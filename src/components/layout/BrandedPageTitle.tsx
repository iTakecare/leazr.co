import { useEffect } from 'react';

interface BrandedPageTitleProps {
  title?: string;
}

export const BrandedPageTitle = ({ title }: BrandedPageTitleProps) => {
  useEffect(() => {
    const pageTitle = title ? `${title} - Leazr` : 'Leazr';
    document.title = pageTitle;
  }, [title]);

  return null;
};
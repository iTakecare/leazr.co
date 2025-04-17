
import React, { useEffect, useState } from "react";
import { getPageBySlug } from "@/services/pageService";
import { Loader2 } from "lucide-react";

interface PageContentDisplayProps {
  slug: string;
  setPageTitle?: boolean;
}

const PageContentDisplay = ({ slug, setPageTitle = true }: PageContentDisplayProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const pageData = await getPageBySlug(slug);
        if (pageData) {
          setContent(pageData.content);
          
          // Mettre à jour les métadonnées de la page si nécessaire
          if (setPageTitle) {
            document.title = pageData.meta_title || pageData.title;
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription && pageData.meta_description) {
              metaDescription.setAttribute('content', pageData.meta_description);
            } else if (pageData.meta_description) {
              const meta = document.createElement('meta');
              meta.name = "description";
              meta.content = pageData.meta_description;
              document.head.appendChild(meta);
            }
          }
        } else {
          setError("Contenu de page non disponible");
        }
      } catch (err) {
        console.error("Erreur lors du chargement du contenu:", err);
        setError("Impossible de charger le contenu");
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [slug, setPageTitle]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive py-4">{error}</div>;
  }

  return (
    <div className="cms-content" dangerouslySetInnerHTML={{ __html: content }} />
  );
};

export default PageContentDisplay;

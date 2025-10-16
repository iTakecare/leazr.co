import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { renderTemplate, resolveImagePaths } from "@/services/handlebarsRenderService";
import { generateDemoData } from "@/services/pdfDemoDataService";

interface PDFTemplatePreviewProps {
  template: any;
  customizationData: any;
  htmlContent: string;
  cssContent: string;
  manifest: any;
}

export default function PDFTemplatePreview({
  template,
  customizationData,
  htmlContent,
  cssContent,
  manifest,
}: PDFTemplatePreviewProps) {
  
  const renderedContent = useMemo(() => {
    if (!htmlContent || !manifest) {
      return { html: '', css: '', error: null };
    }

    try {
      // Generate demo data based on manifest variables
      const demoData = generateDemoData(manifest, {
        name: customizationData.texts?.companyName || 'iTakecare',
        logo: customizationData.logo?.url,
      });

      // Render template with Handlebars
      let renderedHtml = renderTemplate(htmlContent, demoData);

      // Resolve image paths
      const templateSlug = template?.template_metadata?.slug || template?.id || 'itakecare-v1';
      renderedHtml = resolveImagePaths(renderedHtml, templateSlug, customizationData.images);

      // Replace custom logo if provided
      if (customizationData.logo?.url) {
        renderedHtml = renderedHtml.replace(
          /src=["'][^"']*logo[^"']*["']/gi,
          `src="${customizationData.logo.url}"`
        );
      }

      // Apply CSS with custom colors
      const customCss = `
        :root {
          --primary-color: ${customizationData.colors.primary};
          --secondary-color: ${customizationData.colors.secondary};
          --accent-color: ${customizationData.colors.accent};
        }
        ${cssContent}
      `;

      return { html: renderedHtml, css: customCss, error: null };
    } catch (error) {
      console.error('Error rendering template:', error);
      return { 
        html: '', 
        css: '', 
        error: error instanceof Error ? error.message : 'Erreur de rendu du template' 
      };
    }
  }, [htmlContent, cssContent, customizationData, manifest, template]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Aperçu en temps réel</h3>
      </div>
      
      {renderedContent.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {renderedContent.error}
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="flex-1 p-4 bg-muted/50">
          <ScrollArea className="h-full">
            <div className="bg-white rounded-lg shadow-lg p-8 mx-auto max-w-3xl">
              <style dangerouslySetInnerHTML={{ __html: renderedContent.css }} />
              <div 
                className="pdf-preview-content"
                dangerouslySetInnerHTML={{ __html: renderedContent.html }}
              />
            </div>
          </ScrollArea>
        </Card>
      )}
      
      <p className="text-xs text-muted-foreground mt-2">
        L'aperçu montre le template avec vos personnalisations et des données de démonstration. 
        Le rendu final du PDF peut légèrement différer.
      </p>
    </div>
  );
}

import { useMemo, useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { renderTemplate, resolveImagePaths } from "@/services/handlebarsRenderService";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Resolve CSS asset paths
  const resolveCssAssetPaths = (css: string, templateSlug: string): string => {
    return css.replace(
      /url\((['"]?)\.\/assets\/([^'")]+)\1\)/g,
      `url('/pdf-templates/${templateSlug}/assets/$2')`
    );
  };

  // Calculate scale to fit container
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const A4_WIDTH_PX = 794; // 210mm at 96dpi
        const calculatedScale = Math.min(1, (containerWidth - 32) / A4_WIDTH_PX);
        setScale(calculatedScale);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  const renderedContent = useMemo(() => {
    if (!htmlContent || !manifest) {
      return { srcDoc: '', error: !manifest ? 'Manifest non disponible' : null };
    }

    try {
      const templateSlug = template?.template_metadata?.slug || template?.id || 'itakecare-v1';

      // Prepare minimal data (no demo data, only company info if available)
      const templateData = {
        company: {
          name: customizationData.texts?.companyName || '',
          logo: customizationData.logo?.url || '',
        }
      };

      // Render template with Handlebars
      let renderedHtml = renderTemplate(htmlContent, templateData);

      // Resolve image paths
      renderedHtml = resolveImagePaths(renderedHtml, templateSlug, customizationData.images);

      // Replace custom logo if provided
      if (customizationData.logo?.url) {
        renderedHtml = renderedHtml.replace(
          /src=["'][^"']*logo[^"']*["']/gi,
          `src="${customizationData.logo.url}"`
        );
      }

      // Filter disabled sections
      const parser = new DOMParser();
      const doc = parser.parseFromString(renderedHtml, 'text/html');
      
      Object.entries(customizationData.sections || {}).forEach(([id, config]: [string, any]) => {
        if (config && config.enabled === false) {
          doc.querySelector(`#${id}`)?.remove();
        }
      });
      
      const finalHtml = doc.body.innerHTML;

      // Override color variables
      const colorOverrides = `
        :root {
          --primary-color: ${customizationData.colors.primary};
          --secondary-color: ${customizationData.colors.secondary};
          --accent-color: ${customizationData.colors.accent};
          --blue-medium: ${customizationData.colors.primary};
          --blue-dark: ${customizationData.colors.secondary};
          --turquoise: ${customizationData.colors.accent};
        }
      `;

      // Resolve CSS asset paths
      const resolvedCss = resolveCssAssetPaths(cssContent, templateSlug);

      // Build complete HTML document for iframe
      const srcDoc = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${colorOverrides}
    ${resolvedCss}
  </style>
</head>
<body>
  ${finalHtml}
</body>
</html>`;

      return { srcDoc, error: null };
    } catch (error) {
      console.error('Error rendering template:', error);
      return { 
        srcDoc: '', 
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
        <Card className="flex-1 bg-muted/50 p-4">
          <ScrollArea className="h-full">
            <div ref={containerRef} className="flex justify-center">
              <div 
                style={{ 
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  width: '794px', // A4 width at 96dpi
                  transition: 'transform 0.2s ease-out'
                }}
              >
                <div className="bg-white shadow-2xl rounded-sm overflow-hidden">
                  <iframe
                    srcDoc={renderedContent.srcDoc}
                    className="w-full border-0"
                    style={{ 
                      height: '1123px', // A4 height at 96dpi
                      display: 'block'
                    }}
                    sandbox="allow-same-origin"
                    title="PDF Template Preview"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>
      )}
      
      <p className="text-xs text-muted-foreground mt-2">
        L'aperçu montre le template avec vos personnalisations. 
        Les sections désactivées n'apparaissent pas. Le rendu final du PDF peut légèrement différer.
      </p>
    </div>
  );
}

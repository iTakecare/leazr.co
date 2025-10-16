import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";

interface PDFTemplatePreviewProps {
  template: any;
  customizationData: any;
  htmlContent: string;
  cssContent: string;
}

export default function PDFTemplatePreview({
  template,
  customizationData,
  htmlContent,
  cssContent,
}: PDFTemplatePreviewProps) {
  // Apply customization to HTML preview
  const getPreviewHtml = () => {
    let html = htmlContent || template?.html_content || "";
    
    // Replace color variables
    html = html.replace(/var\(--primary-color\)/g, customizationData.colors.primary);
    html = html.replace(/var\(--secondary-color\)/g, customizationData.colors.secondary);
    html = html.replace(/var\(--accent-color\)/g, customizationData.colors.accent);
    
    // Replace logo URL
    if (customizationData.logo.url) {
      html = html.replace(/{{logo_url}}/g, customizationData.logo.url);
    }
    
    // Replace text variables
    Object.entries(customizationData.texts).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value as string);
    });
    
    return html;
  };

  const getPreviewCss = () => {
    let css = cssContent || template?.css_content || "";
    
    // Add custom color variables
    css = `
      :root {
        --primary-color: ${customizationData.colors.primary};
        --secondary-color: ${customizationData.colors.secondary};
        --accent-color: ${customizationData.colors.accent};
      }
      ${css}
    `;
    
    return css;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Aperçu en temps réel</h3>
      </div>
      
      <Card className="flex-1 p-4 bg-muted/50">
        <ScrollArea className="h-full">
          <div className="bg-white rounded-lg shadow-lg p-8 mx-auto max-w-3xl">
            <style dangerouslySetInnerHTML={{ __html: getPreviewCss() }} />
            <div 
              className="pdf-preview-content"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          </div>
        </ScrollArea>
      </Card>
      
      <p className="text-xs text-muted-foreground mt-2">
        L'aperçu montre le template avec vos personnalisations appliquées. 
        Le rendu final du PDF peut légèrement différer.
      </p>
    </div>
  );
}

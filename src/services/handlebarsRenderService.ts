import Handlebars from 'handlebars';

/**
 * Service to render HTML templates with Handlebars
 */

// Register Handlebars helpers
Handlebars.registerHelper('formatCurrency', function(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value || 0);
});

Handlebars.registerHelper('formatDate', function(date: string | Date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(date));
});

Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

export const compileTemplate = (htmlContent: string) => {
  try {
    return Handlebars.compile(htmlContent);
  } catch (error) {
    console.error('Error compiling Handlebars template:', error);
    throw error;
  }
};

export const renderTemplate = (htmlContent: string, data: any): string => {
  try {
    const template = compileTemplate(htmlContent);
    return template(data);
  } catch (error) {
    console.error('Error rendering template:', error);
    throw error;
  }
};

export const resolveImagePaths = (html: string, templateSlug: string, customImages: Record<string, string> = {}): string => {
  let processedHtml = html;
  
  // Replace relative image paths with absolute public URLs
  processedHtml = processedHtml.replace(
    /src=["']\.\/assets\/([^"']+)["']/g,
    (match, filename) => {
      // Check if there's a custom image for this asset
      const assetKey = filename.replace(/\.[^.]+$/, ''); // Remove extension
      if (customImages[assetKey]) {
        return `src="${customImages[assetKey]}"`;
      }
      // Use default template asset
      return `src="/pdf-templates/${templateSlug}/assets/${filename}"`;
    }
  );
  
  return processedHtml;
};

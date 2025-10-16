/**
 * Service to load PDF template files (HTML, CSS, manifest)
 */

export interface TemplateManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  pages: Array<{
    id: string;
    title: string;
    order: number;
  }>;
  variables: {
    [key: string]: string[];
  };
  assets: {
    [key: string]: string;
  };
  preview?: string;
}

export const loadTemplateHtml = async (templateSlug: string): Promise<string> => {
  try {
    const response = await fetch(`/pdf-templates/${templateSlug}/template.html`);
    if (!response.ok) {
      throw new Error(`Failed to load template HTML: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading template HTML:', error);
    throw error;
  }
};

export const loadTemplateCss = async (templateSlug: string): Promise<string> => {
  try {
    const response = await fetch(`/pdf-templates/${templateSlug}/styles.css`);
    if (!response.ok) {
      throw new Error(`Failed to load template CSS: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading template CSS:', error);
    throw error;
  }
};

export const loadTemplateManifest = async (templateSlug: string): Promise<TemplateManifest> => {
  try {
    const response = await fetch(`/pdf-templates/${templateSlug}/manifest.json`);
    if (!response.ok) {
      throw new Error(`Failed to load template manifest: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading template manifest:', error);
    throw error;
  }
};

export const loadTemplateFiles = async (templateSlug: string) => {
  const [html, css, manifest] = await Promise.all([
    loadTemplateHtml(templateSlug),
    loadTemplateCss(templateSlug),
    loadTemplateManifest(templateSlug),
  ]);

  return { html, css, manifest };
};

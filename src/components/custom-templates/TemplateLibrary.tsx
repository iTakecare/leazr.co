import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Star, Eye } from 'lucide-react';
import { templateSharingService } from '@/services/templateSharingService';
import { TemplateLibraryItem, TemplateCategory } from '@/types/customPdfTemplate';
import { toast } from 'sonner';

interface TemplateLibraryProps {
  clientId: string;
  onTemplateDownload?: (template: any) => void;
}

export function TemplateLibrary({ clientId, onTemplateDownload }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<TemplateLibraryItem[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [searchQuery, selectedCategory]);

  const loadData = async () => {
    try {
      const [templatesData, categoriesData] = await Promise.all([
        templateSharingService.getLibraryTemplates(),
        templateSharingService.getCategories()
      ]);
      setTemplates(templatesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading library data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await templateSharingService.getLibraryTemplates(
        selectedCategory || undefined,
        searchQuery || undefined
      );
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleDownload = async (template: TemplateLibraryItem) => {
    try {
      const downloadedTemplate = await templateSharingService.downloadFromLibrary(
        template.id,
        clientId
      );
      toast.success('Template téléchargé avec succès');
      onTemplateDownload?.(downloadedTemplate);
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.is_featured && (
                  <Badge variant="default">
                    <Star className="h-3 w-3 mr-1" />
                    Vedette
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-sm">{template.rating_average.toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({template.rating_count} avis)
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  Aperçu
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload(template)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
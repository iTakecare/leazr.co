import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, GitBranch, RotateCcw, Eye } from 'lucide-react';
import { templateVersioningService } from '@/services/templateVersioningService';
import { TemplateVersion } from '@/types/customPdfTemplate';
import { toast } from 'sonner';

interface VersionHistoryProps {
  templateId: string;
  onRestoreVersion?: (version: TemplateVersion) => void;
}

export function VersionHistory({ templateId, onRestoreVersion }: VersionHistoryProps) {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [templateId]);

  const loadVersions = async () => {
    try {
      const data = await templateVersioningService.getTemplateVersions(templateId);
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast.error('Erreur lors du chargement des versions');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: TemplateVersion) => {
    try {
      await templateVersioningService.restoreVersion(templateId, version.id);
      toast.success(`Version ${version.version_number} restaurée`);
      onRestoreVersion?.(version);
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Erreur lors de la restauration');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des versions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {versions.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Badge variant={version.is_major_version ? "default" : "secondary"}>
                v{version.version_number}
              </Badge>
              <div>
                <p className="font-medium">{version.changes_description || 'Modification'}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(version.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Voir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestore(version)}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Restaurer
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
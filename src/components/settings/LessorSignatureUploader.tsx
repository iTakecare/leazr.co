import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Trash2, PenLine, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getFileUploadClient } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';

interface LessorSignatureUploaderProps {
  currentSignatureUrl?: string | null;
  currentRepresentativeName?: string | null;
  currentRepresentativeTitle?: string | null;
  onUpdate: () => void;
}

const LessorSignatureUploader: React.FC<LessorSignatureUploaderProps> = ({
  currentSignatureUrl,
  currentRepresentativeName,
  currentRepresentativeTitle,
  onUpdate,
}) => {
  const { companyId } = useMultiTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [representativeName, setRepresentativeName] = useState(currentRepresentativeName || '');
  const [representativeTitle, setRepresentativeTitle] = useState(currentRepresentativeTitle || '');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    try {
      setUploading(true);

      // Upload to storage
      const fileName = `${companyId}/lessor-signature.${file.name.split('.').pop()}`;
      const fileClient = getFileUploadClient();

      const { error: uploadError } = await fileClient.storage
        .from('company-assets')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = fileClient.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      const signatureUrl = urlData?.publicUrl;

      // Update company record
      const { error: updateError } = await supabase
        .from('companies')
        .update({ signature_url: signatureUrl })
        .eq('id', companyId);

      if (updateError) {
        throw updateError;
      }

      toast.success('Signature du bailleur mise à jour');
      onUpdate();
    } catch (error) {
      console.error('[LESSOR-SIGNATURE] Upload error:', error);
      toast.error('Erreur lors du téléchargement de la signature');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteSignature = async () => {
    if (!companyId) return;

    try {
      setUploading(true);

      const { error } = await supabase
        .from('companies')
        .update({ signature_url: null })
        .eq('id', companyId);

      if (error) {
        throw error;
      }

      toast.success('Signature supprimée');
      onUpdate();
    } catch (error) {
      console.error('[LESSOR-SIGNATURE] Delete error:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveRepresentativeInfo = async () => {
    if (!companyId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('companies')
        .update({
          signature_representative_name: representativeName || null,
          signature_representative_title: representativeTitle || null,
        })
        .eq('id', companyId);

      if (error) {
        throw error;
      }

      toast.success('Informations du représentant mises à jour');
      onUpdate();
    } catch (error) {
      console.error('[LESSOR-SIGNATURE] Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="h-5 w-5" />
          Signature du bailleur
        </CardTitle>
        <CardDescription>
          Configurez la signature qui apparaîtra automatiquement sur les contrats signés
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signature image */}
        <div className="space-y-3">
          <Label>Image de signature</Label>
          {currentSignatureUrl ? (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex-shrink-0 bg-white p-2 rounded border">
                <img
                  src={currentSignatureUrl}
                  alt="Signature du bailleur"
                  className="h-16 w-auto max-w-[200px] object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Signature actuelle</p>
                <p className="text-xs text-muted-foreground truncate">
                  Cette signature apparaîtra sur les contrats PDF
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSignature}
                disabled={uploading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
              <div className="text-center">
                <PenLine className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Aucune signature configurée
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {currentSignatureUrl ? 'Changer la signature' : 'Télécharger une signature'}
            </Button>
            <span className="text-xs text-muted-foreground">PNG, JPG jusqu'à 2 Mo</span>
          </div>
        </div>

        {/* Representative info */}
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="representative_name">Nom du représentant légal</Label>
              <Input
                id="representative_name"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="Ex: Jean Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representative_title">Fonction / Titre</Label>
              <Input
                id="representative_title"
                value={representativeTitle}
                onChange={(e) => setRepresentativeTitle(e.target.value)}
                placeholder="Ex: Administrateur délégué"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveRepresentativeInfo}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LessorSignatureUploader;

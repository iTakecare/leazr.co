
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserExtended, updateUserAvatar } from "@/services/userService";
import { downloadAndStoreImage } from "@/services/storageService";
import { Image, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminFormProps {
  user?: UserExtended;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isCreating: boolean;
}

export const AdminForm: React.FC<AdminFormProps> = ({ 
  user, 
  onSubmit, 
  onCancel,
  isCreating
}) => {
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [company, setCompany] = useState(user?.company || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    setAvatarFile(file);
    
    // Afficher une prévisualisation de l'image
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!user?.id || !avatarFile) return avatarUrl;
    
    try {
      setUploading(true);
      
      // Générer un nom de fichier unique
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Vérifier si le bucket existe et le créer si nécessaire
      const bucketExists = await supabase.storage.getBucket('avatars');
      if (!bucketExists.data) {
        await supabase.storage.createBucket('avatars', {
          public: true
        });
      }
      
      // Uploader le fichier
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Mettre à jour l'avatar de l'utilisateur
      const success = await updateUserAvatar(user.id, urlData.publicUrl);
      
      if (!success) {
        throw new Error("Échec de la mise à jour de l'avatar dans la base de données");
      }
      
      toast.success("Avatar mis à jour avec succès");
      return urlData.publicUrl;
    } catch (error: any) {
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      return avatarUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation de base
    if (!email) {
      toast.error("L'email est requis");
      return;
    }
    
    if (isCreating && !password) {
      toast.error("Le mot de passe est requis pour créer un nouvel administrateur");
      return;
    }
    
    try {
      // Uploader l'avatar si nécessaire
      let finalAvatarUrl = avatarUrl;
      if (avatarFile && user?.id) {
        finalAvatarUrl = await uploadAvatar();
      }
      
      // Préparer les données à soumettre
      const formData: any = {
        first_name: firstName,
        last_name: lastName,
        company
      };
      
      if (isCreating) {
        formData.email = email;
        formData.password = password;
      }
      
      if (finalAvatarUrl && finalAvatarUrl !== user?.avatar_url) {
        formData.avatar_url = finalAvatarUrl;
      }
      
      // Soumettre le formulaire
      onSubmit(formData);
    } catch (error: any) {
      toast.error(`Erreur lors de la soumission du formulaire: ${error.message}`);
    }
  };

  const removeAvatar = () => {
    setAvatarUrl("");
    setAvatarFile(null);
    
    // Si on modifie un utilisateur existant et qu'il a un avatar, on proposera de le supprimer lors de la soumission
    if (user?.id && user?.avatar_url) {
      // Cette logique sera gérée lors de la soumission du formulaire
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="Avatar" />
            ) : (
              <AvatarFallback className="text-xl">{getInitials() || "AD"}</AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Envoi...' : 'Changer'}
            </Button>
            
            {avatarUrl && (
              <Button 
                type="button"
                variant="outline"
                size="sm"
                onClick={removeAvatar}
                className="text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            )}
            
            <input
              id="avatar-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
        </div>
        
        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            disabled={!isCreating} // On ne peut pas modifier l'email d'un utilisateur existant
          />
        </div>
        
        {isCreating && (
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="company">Société (optionnel)</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Nom de la société"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={uploading}>
          {isCreating ? "Créer" : "Mettre à jour"}
        </Button>
      </div>
    </form>
  );
};

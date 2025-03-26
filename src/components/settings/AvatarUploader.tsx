
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Upload, Camera, User } from "lucide-react";

const AvatarUploader = () => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchAvatar();
    }
  }, [user]);
  
  const fetchAvatar = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Vérifier si l'utilisateur a un avatar dans son profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Erreur lors de la récupération du profil:", profileError);
        return;
      }
      
      if (profileData?.avatar_url) {
        setAvatarUrl(profileData.avatar_url);
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'avatar:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!user?.id) {
        toast.error("Vous devez être connecté pour changer votre avatar");
        return;
      }
      
      const file = event.target.files?.[0];
      if (!file) return;
      
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        toast.error("Le fichier doit être une image");
        return;
      }
      
      // Limiter la taille du fichier (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("L'image est trop volumineuse (max 2MB)");
        return;
      }
      
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      
      // Uploader l'image
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });
      
      if (error) {
        console.error("Erreur lors de l'upload:", error);
        toast.error("Erreur lors de l'upload de l'avatar");
        return;
      }
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      const avatarUrl = urlData.publicUrl;
      
      // Mettre à jour le profil avec la nouvelle URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error("Erreur lors de la mise à jour du profil:", updateError);
        toast.error("Erreur lors de la mise à jour du profil");
        return;
      }
      
      setAvatarUrl(avatarUrl);
      toast.success("Avatar mis à jour avec succès");
      
    } catch (error) {
      console.error("Erreur lors de l'upload de l'avatar:", error);
      toast.error("Erreur lors de l'upload de l'avatar");
    } finally {
      setUploading(false);
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (!user?.id || !avatarUrl) return;
    
    try {
      setUploading(true);
      
      // Extraire le chemin du fichier depuis l'URL
      const path = avatarUrl.split('/').slice(-2).join('/');
      
      // Supprimer l'image du stockage
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([path]);
      
      if (storageError) {
        console.error("Erreur lors de la suppression de l'image:", storageError);
      }
      
      // Mettre à jour le profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error("Erreur lors de la mise à jour du profil:", updateError);
        toast.error("Erreur lors de la suppression de l'avatar");
        return;
      }
      
      setAvatarUrl(null);
      toast.success("Avatar supprimé avec succès");
      
    } catch (error) {
      console.error("Erreur lors de la suppression de l'avatar:", error);
      toast.error("Erreur lors de la suppression de l'avatar");
    } finally {
      setUploading(false);
    }
  };
  
  const getInitials = () => {
    if (!user) return "?";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    
    return "?";
  };
  
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Avatar utilisateur</CardTitle>
          <CardDescription>Vous devez être connecté pour gérer votre avatar</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatar utilisateur</CardTitle>
        <CardDescription>Personnalisez votre avatar qui sera affiché sur la plateforme</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-primary/20">
            {loading ? (
              <AvatarFallback>
                <Loader2 className="h-6 w-6 animate-spin" />
              </AvatarFallback>
            ) : (
              <>
                <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          
          <label 
            htmlFor="avatar-upload" 
            className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
          >
            <Camera className="h-4 w-4" />
          </label>
          <input 
            id="avatar-upload" 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </div>
        
        <div className="text-center space-y-1">
          <p className="font-medium text-sm">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        
        <div className="flex space-x-2 mt-4">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading || !avatarUrl}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Supprimer
          </Button>
          
          <label htmlFor="avatar-upload-btn">
            <Button 
              asChild
              variant="default" 
              size="sm"
              disabled={uploading}
            >
              <span>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Changer
              </span>
            </Button>
          </label>
          <input 
            id="avatar-upload-btn" 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Formats acceptés: JPG, PNG, GIF. Taille max: 2MB.
        </p>
      </CardContent>
    </Card>
  );
};

export default AvatarUploader;

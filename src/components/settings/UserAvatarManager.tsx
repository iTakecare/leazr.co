
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { uploadImage } from '@/services/fileUploadService';
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const UserAvatarManager = () => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Erreur lors de la récupération de l'avatar:", error);
          return;
        }
        
        setAvatarUrl(data?.avatar_url || null);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'avatar:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserAvatar();
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner un fichier image");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file, "user-avatars", user.id);
      
      if (result) {
        setAvatarUrl(result.url);
        
        // Mettre à jour le profil utilisateur avec le nouvel avatar
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: result.url })
          .eq('id', user.id);
          
        if (error) {
          console.error("Erreur lors de la mise à jour du profil:", error);
          toast.error("Erreur lors de la mise à jour du profil");
          return;
        }
        
        toast.success("Avatar mis à jour avec succès");
      } else {
        toast.error("Échec du téléchargement de l'avatar");
      }
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      toast.error("Erreur de téléchargement de l'avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    try {
      setIsUploading(true);
      
      // Mettre à jour le profil utilisateur pour supprimer l'avatar
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
        
      if (error) {
        console.error("Erreur lors de la suppression de l'avatar:", error);
        toast.error("Erreur lors de la suppression de l'avatar");
        return;
      }
      
      setAvatarUrl(null);
      toast.success("Avatar supprimé avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression de l'avatar:", error);
      toast.error("Erreur lors de la suppression de l'avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const getUserInitials = () => {
    if (!user) return "?";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    
    return "?";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatar de profil</CardTitle>
        <CardDescription>
          Personnalisez votre avatar qui sera affiché dans l'application
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl || ''} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col items-center">
              <Label 
                htmlFor="avatar-upload" 
                className="cursor-pointer px-4 py-2 text-sm font-medium text-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
              >
                {isUploading ? "Téléchargement..." : "Changer d'avatar"}
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {avatarUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                >
                  Supprimer l'avatar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserAvatarManager;

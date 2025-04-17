
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SocialSettings = () => {
  const [facebookSettings, setFacebookSettings] = useState({
    enabled: true,
    defaultImage: "/lovable-uploads/bd59707a-2419-4827-b053-ae8e517c967b.png",
    appId: "",
    adminId: "",
    defaultTitle: "iTakecare - Location d'équipement informatique reconditionné",
    defaultDescription: "iTakecare propose la location d'équipement informatique reconditionné de haute qualité pour les entreprises soucieuses de l'environnement."
  });

  const [twitterSettings, setTwitterSettings] = useState({
    enabled: true,
    defaultImage: "/lovable-uploads/bd59707a-2419-4827-b053-ae8e517c967b.png",
    username: "@itakecare",
    cardType: "summary_large_image",
    defaultTitle: "iTakecare - Location d'équipement informatique reconditionné",
    defaultDescription: "iTakecare propose la location d'équipement informatique reconditionné de haute qualité pour les entreprises soucieuses de l'environnement."
  });

  const [linkedinSettings, setLinkedinSettings] = useState({
    enabled: true,
    defaultImage: "/lovable-uploads/bd59707a-2419-4827-b053-ae8e517c967b.png",
    defaultTitle: "iTakecare - Location d'équipement informatique reconditionné",
    defaultDescription: "iTakecare propose la location d'équipement informatique reconditionné de haute qualité pour les entreprises soucieuses de l'environnement."
  });

  const handleSaveFacebook = () => {
    console.log("Sauvegarde des paramètres Facebook", facebookSettings);
  };

  const handleSaveTwitter = () => {
    console.log("Sauvegarde des paramètres Twitter", twitterSettings);
  };

  const handleSaveLinkedin = () => {
    console.log("Sauvegarde des paramètres LinkedIn", linkedinSettings);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="facebook">
        <TabsList>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="twitter">Twitter</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        </TabsList>
        
        <TabsContent value="facebook" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Paramètres Facebook</CardTitle>
                  <CardDescription>
                    Configurez les métadonnées Open Graph pour Facebook
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="facebookEnabled" 
                    checked={facebookSettings.enabled}
                    onCheckedChange={(checked) => 
                      setFacebookSettings({...facebookSettings, enabled: checked})
                    }
                  />
                  <Label htmlFor="facebookEnabled">Activer</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Image par défaut pour Facebook</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {facebookSettings.defaultImage ? (
                    <div className="space-y-2">
                      <img 
                        src={facebookSettings.defaultImage} 
                        alt="Aperçu" 
                        className="h-[200px] mx-auto rounded"
                      />
                      <p className="text-sm text-gray-500">
                        Recommandé : 1200 x 630 pixels
                      </p>
                      <Button variant="outline" size="sm">
                        Changer d'image
                      </Button>
                    </div>
                  ) : (
                    <div className="p-8">
                      <p className="text-sm text-gray-500 mb-2">
                        Aucune image sélectionnée. Recommandé : 1200 x 630 pixels
                      </p>
                      <Button variant="outline" size="sm">
                        Télécharger une image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebookAppId">ID d'application Facebook</Label>
                  <Input 
                    id="facebookAppId" 
                    value={facebookSettings.appId}
                    onChange={(e) => 
                      setFacebookSettings({...facebookSettings, appId: e.target.value})
                    }
                    placeholder="123456789012345"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="facebookAdminId">ID d'administrateur Facebook</Label>
                  <Input 
                    id="facebookAdminId" 
                    value={facebookSettings.adminId}
                    onChange={(e) => 
                      setFacebookSettings({...facebookSettings, adminId: e.target.value})
                    }
                    placeholder="123456789012345"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="facebookTitle">Titre par défaut</Label>
                <Input 
                  id="facebookTitle" 
                  value={facebookSettings.defaultTitle}
                  onChange={(e) => 
                    setFacebookSettings({...facebookSettings, defaultTitle: e.target.value})
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="facebookDescription">Description par défaut</Label>
                <Textarea 
                  id="facebookDescription" 
                  value={facebookSettings.defaultDescription}
                  onChange={(e) => 
                    setFacebookSettings({...facebookSettings, defaultDescription: e.target.value})
                  }
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  {facebookSettings.defaultDescription.length}/300 caractères recommandés
                </p>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Aperçu</h3>
                <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                  <div className="h-[200px] bg-gray-200 overflow-hidden">
                    {facebookSettings.defaultImage && (
                      <img 
                        src={facebookSettings.defaultImage} 
                        alt="Aperçu" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm text-blue-600 mb-1">www.itakecare.com</div>
                    <div className="text-base font-bold mb-1">{facebookSettings.defaultTitle}</div>
                    <div className="text-sm text-gray-700">{facebookSettings.defaultDescription}</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveFacebook}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="twitter" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Paramètres Twitter</CardTitle>
                  <CardDescription>
                    Configurez les métadonnées Twitter Cards
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="twitterEnabled" 
                    checked={twitterSettings.enabled}
                    onCheckedChange={(checked) => 
                      setTwitterSettings({...twitterSettings, enabled: checked})
                    }
                  />
                  <Label htmlFor="twitterEnabled">Activer</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Image par défaut pour Twitter</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {twitterSettings.defaultImage ? (
                    <div className="space-y-2">
                      <img 
                        src={twitterSettings.defaultImage} 
                        alt="Aperçu" 
                        className="h-[200px] mx-auto rounded"
                      />
                      <p className="text-sm text-gray-500">
                        Recommandé : 800 x 418 pixels
                      </p>
                      <Button variant="outline" size="sm">
                        Changer d'image
                      </Button>
                    </div>
                  ) : (
                    <div className="p-8">
                      <p className="text-sm text-gray-500 mb-2">
                        Aucune image sélectionnée. Recommandé : 800 x 418 pixels
                      </p>
                      <Button variant="outline" size="sm">
                        Télécharger une image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitterUsername">Nom d'utilisateur Twitter</Label>
                  <Input 
                    id="twitterUsername" 
                    value={twitterSettings.username}
                    onChange={(e) => 
                      setTwitterSettings({...twitterSettings, username: e.target.value})
                    }
                    placeholder="@votrecompte"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="twitterCardType">Type de carte</Label>
                  <Select 
                    value={twitterSettings.cardType} 
                    onValueChange={(value) => 
                      setTwitterSettings({...twitterSettings, cardType: value})
                    }
                  >
                    <SelectTrigger id="twitterCardType">
                      <SelectValue placeholder="Type de carte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Résumé</SelectItem>
                      <SelectItem value="summary_large_image">Résumé avec grande image</SelectItem>
                      <SelectItem value="app">Application</SelectItem>
                      <SelectItem value="player">Lecteur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twitterTitle">Titre par défaut</Label>
                <Input 
                  id="twitterTitle" 
                  value={twitterSettings.defaultTitle}
                  onChange={(e) => 
                    setTwitterSettings({...twitterSettings, defaultTitle: e.target.value})
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twitterDescription">Description par défaut</Label>
                <Textarea 
                  id="twitterDescription" 
                  value={twitterSettings.defaultDescription}
                  onChange={(e) => 
                    setTwitterSettings({...twitterSettings, defaultDescription: e.target.value})
                  }
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  {twitterSettings.defaultDescription.length}/200 caractères recommandés
                </p>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Aperçu</h3>
                <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                  <div className="h-[250px] bg-gray-200 overflow-hidden">
                    {twitterSettings.defaultImage && (
                      <img 
                        src={twitterSettings.defaultImage} 
                        alt="Aperçu" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-base font-bold mb-1">{twitterSettings.defaultTitle}</div>
                    <div className="text-sm text-gray-700 mb-2">{twitterSettings.defaultDescription}</div>
                    <div className="text-sm text-gray-500">itakecare.com</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveTwitter}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="linkedin" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Paramètres LinkedIn</CardTitle>
                  <CardDescription>
                    Configurez les métadonnées pour le partage sur LinkedIn
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="linkedinEnabled" 
                    checked={linkedinSettings.enabled}
                    onCheckedChange={(checked) => 
                      setLinkedinSettings({...linkedinSettings, enabled: checked})
                    }
                  />
                  <Label htmlFor="linkedinEnabled">Activer</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Image par défaut pour LinkedIn</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {linkedinSettings.defaultImage ? (
                    <div className="space-y-2">
                      <img 
                        src={linkedinSettings.defaultImage} 
                        alt="Aperçu" 
                        className="h-[200px] mx-auto rounded"
                      />
                      <p className="text-sm text-gray-500">
                        Recommandé : 1200 x 627 pixels
                      </p>
                      <Button variant="outline" size="sm">
                        Changer d'image
                      </Button>
                    </div>
                  ) : (
                    <div className="p-8">
                      <p className="text-sm text-gray-500 mb-2">
                        Aucune image sélectionnée. Recommandé : 1200 x 627 pixels
                      </p>
                      <Button variant="outline" size="sm">
                        Télécharger une image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="linkedinTitle">Titre par défaut</Label>
                <Input 
                  id="linkedinTitle" 
                  value={linkedinSettings.defaultTitle}
                  onChange={(e) => 
                    setLinkedinSettings({...linkedinSettings, defaultTitle: e.target.value})
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="linkedinDescription">Description par défaut</Label>
                <Textarea 
                  id="linkedinDescription" 
                  value={linkedinSettings.defaultDescription}
                  onChange={(e) => 
                    setLinkedinSettings({...linkedinSettings, defaultDescription: e.target.value})
                  }
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  {linkedinSettings.defaultDescription.length}/250 caractères recommandés
                </p>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Aperçu</h3>
                <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                  <div className="h-[200px] bg-gray-200 overflow-hidden">
                    {linkedinSettings.defaultImage && (
                      <img 
                        src={linkedinSettings.defaultImage} 
                        alt="Aperçu" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-base font-bold mb-1">{linkedinSettings.defaultTitle}</div>
                    <div className="text-sm text-gray-700 mb-2">{linkedinSettings.defaultDescription}</div>
                    <div className="text-sm text-gray-500">itakecare.com</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveLinkedin}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialSettings;

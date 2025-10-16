import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TestTube, Palette } from "lucide-react";
import { PdfTemplateTest } from "@/components/admin/PdfTemplateTest";

export const PdfTemplateSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestion des Templates PDF
          </CardTitle>
          <CardDescription>
            Gérez les templates PDF pour vos offres et testez la génération de documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="test" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Test de génération
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Templates disponibles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="mt-6">
              <PdfTemplateTest />
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Templates disponibles</CardTitle>
                  <CardDescription>
                    Liste des templates PDF configurés pour votre entreprise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">iTakecare v1</h4>
                        <p className="text-sm text-muted-foreground">
                          Template officiel iTakecare avec design Canva fidèle
                        </p>
                      </div>
                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                        Actif
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <span className="ml-2 font-medium">A4</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pages:</span>
                        <span className="ml-2 font-medium">7</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <span className="ml-2 font-medium">1.0.0</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Moteur:</span>
                        <span className="ml-2 font-medium">Puppeteer</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Couleurs:</strong> Primary (#33638e), Secondary (#4ab6c4), Accent (#da2959)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Police:</strong> Carlito (Google Fonts)
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Fonctionnalités du template :</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Couverture personnalisée avec logo entreprise</li>
                      <li>Présentation de la vision et des valeurs</li>
                      <li>Tableau détaillé des équipements</li>
                      <li>Calculs automatiques des totaux</li>
                      <li>Modalités de leasing complètes</li>
                      <li>Section signature électronique</li>
                      <li>Design responsive pour impression</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

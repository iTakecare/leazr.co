import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTemplateDesigner, TemplateDesign } from '@/hooks/useTemplateDesigner';
import { Palette, Layout, Type, FileCheck } from 'lucide-react';

const OfferTemplateDesigner: React.FC = () => {
  const { design, setDesign, saveDesign, loading } = useTemplateDesigner();

  const updateSection = (section: keyof TemplateDesign['sections'], updates: any) => {
    setDesign({
      ...design,
      sections: {
        ...design.sections,
        [section]: { ...design.sections[section], ...updates },
      },
    });
  };

  const updateColors = (color: keyof TemplateDesign['colors'], value: string) => {
    setDesign({
      ...design,
      colors: { ...design.colors, [color]: value },
    });
  };

  const updateFonts = (font: keyof TemplateDesign['fonts'], updates: any) => {
    setDesign({
      ...design,
      fonts: {
        ...design.fonts,
        [font]: { ...design.fonts[font], ...updates },
      },
    });
  };

  const updateLayout = (key: keyof TemplateDesign['layout'], value: number) => {
    setDesign({
      ...design,
      layout: { ...design.layout, [key]: value },
    });
  };

  const handleSave = () => {
    saveDesign(design);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Design de votre template d'offre</h2>
        <p className="text-muted-foreground mt-1">
          Personnalisez l'apparence de toutes vos offres PDF. Les modifications seront appliquées automatiquement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <Tabs defaultValue="sections" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sections">
                <FileCheck className="w-4 h-4 mr-2" />
                Sections
              </TabsTrigger>
              <TabsTrigger value="colors">
                <Palette className="w-4 h-4 mr-2" />
                Couleurs
              </TabsTrigger>
              <TabsTrigger value="fonts">
                <Type className="w-4 h-4 mr-2" />
                Polices
              </TabsTrigger>
              <TabsTrigger value="layout">
                <Layout className="w-4 h-4 mr-2" />
                Mise en page
              </TabsTrigger>
            </TabsList>

            {/* Sections Tab */}
            <TabsContent value="sections" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  {/* Logo */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={design.sections.logo.enabled}
                        onCheckedChange={(checked) =>
                          updateSection('logo', { enabled: checked })
                        }
                      />
                      <Label className="font-semibold">Logo de l'entreprise</Label>
                    </div>
                    {design.sections.logo.enabled && (
                      <div className="ml-6 space-y-2">
                        <div>
                          <Label>Position</Label>
                          <Select
                            value={design.sections.logo.position}
                            onValueChange={(value) => updateSection('logo', { position: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Gauche</SelectItem>
                              <SelectItem value="center">Centre</SelectItem>
                              <SelectItem value="right">Droite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Taille (px)</Label>
                          <Input
                            type="number"
                            value={design.sections.logo.size}
                            onChange={(e) =>
                              updateSection('logo', { size: parseInt(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={design.sections.header.enabled}
                        onCheckedChange={(checked) =>
                          updateSection('header', { enabled: checked })
                        }
                      />
                      <Label className="font-semibold">En-tête</Label>
                    </div>
                    {design.sections.header.enabled && (
                      <div className="ml-6 space-y-2">
                        <div>
                          <Label>Titre</Label>
                          <Input
                            value={design.sections.header.title}
                            onChange={(e) =>
                              updateSection('header', { title: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Sous-titre (optionnel)</Label>
                          <Input
                            value={design.sections.header.subtitle || ''}
                            onChange={(e) =>
                              updateSection('header', { subtitle: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Client Info */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={design.sections.clientInfo.enabled}
                        onCheckedChange={(checked) =>
                          updateSection('clientInfo', { enabled: checked })
                        }
                      />
                      <Label className="font-semibold">Informations client</Label>
                    </div>
                    {design.sections.clientInfo.enabled && (
                      <div className="ml-6 space-y-2">
                        {['name', 'company', 'email', 'phone', 'address'].map((field) => (
                          <div key={field} className="flex items-center space-x-2">
                            <Checkbox
                              checked={design.sections.clientInfo.fields.includes(field)}
                              onCheckedChange={(checked) => {
                                const fields = checked
                                  ? [...design.sections.clientInfo.fields, field]
                                  : design.sections.clientInfo.fields.filter((f) => f !== field);
                                updateSection('clientInfo', { fields });
                              }}
                            />
                            <Label className="capitalize">{field === 'name' ? 'Nom' : field === 'company' ? 'Entreprise' : field === 'email' ? 'Email' : field === 'phone' ? 'Téléphone' : 'Adresse'}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={design.sections.summary.enabled}
                        onCheckedChange={(checked) =>
                          updateSection('summary', { enabled: checked })
                        }
                      />
                      <Label className="font-semibold">Résumé financier</Label>
                    </div>
                    {design.sections.summary.enabled && (
                      <div className="ml-6 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={design.sections.summary.showMonthly}
                            onCheckedChange={(checked) =>
                              updateSection('summary', { showMonthly: checked })
                            }
                          />
                          <Label>Montant mensuel</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={design.sections.summary.showTotal}
                            onCheckedChange={(checked) =>
                              updateSection('summary', { showTotal: checked })
                            }
                          />
                          <Label>Montant total</Label>
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={design.sections.summary.showInsurance}
                              onCheckedChange={(checked) =>
                                updateSection('summary', { showInsurance: checked })
                              }
                            />
                            <Label>Afficher assurance</Label>
                          </div>
                          {design.sections.summary.showInsurance && (
                            <Input
                              placeholder="EST. ASSURANCE ANNUELLE* :"
                              value={design.sections.summary.insuranceLabel}
                              onChange={(e) =>
                                updateSection('summary', { insuranceLabel: e.target.value })
                              }
                              className="ml-6"
                            />
                          )}
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={design.sections.summary.showProcessingFee}
                              onCheckedChange={(checked) =>
                                updateSection('summary', { showProcessingFee: checked })
                              }
                            />
                            <Label>Afficher frais de dossier</Label>
                          </div>
                          {design.sections.summary.showProcessingFee && (
                            <div className="ml-6 space-y-2">
                              <Input
                                placeholder="FRAIS DE DOSSIER UNIQUE* :"
                                value={design.sections.summary.processingFeeLabel}
                                onChange={(e) =>
                                  updateSection('summary', { processingFeeLabel: e.target.value })
                                }
                              />
                              <div>
                                <Label className="text-xs">Montant (€)</Label>
                                <Input
                                  type="number"
                                  placeholder="75"
                                  value={design.sections.summary.processingFeeAmount}
                                  onChange={(e) =>
                                    updateSection('summary', { processingFeeAmount: parseFloat(e.target.value) || 0 })
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Footer */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={design.sections.footer.enabled}
                        onCheckedChange={(checked) =>
                          updateSection('footer', { enabled: checked })
                        }
                      />
                      <Label className="font-semibold">Pied de page</Label>
                    </div>
                    {design.sections.footer.enabled && (
                      <div className="ml-6 space-y-2">
                        <Label className="text-xs text-muted-foreground">Lignes du pied de page</Label>
                        {design.sections.footer.lines.map((line, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Ligne ${index + 1}`}
                              value={line}
                              onChange={(e) => {
                                const newLines = [...design.sections.footer.lines];
                                newLines[index] = e.target.value;
                                updateSection('footer', { lines: newLines });
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newLines = design.sections.footer.lines.filter((_, i) => i !== index);
                                updateSection('footer', { lines: newLines });
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateSection('footer', { lines: [...design.sections.footer.lines, ''] });
                          }}
                        >
                          Ajouter une ligne
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  {Object.entries(design.colors).map(([key, value]) => (
                    <div key={key}>
                      <Label className="capitalize">
                        {key === 'primary' ? 'Primaire' : key === 'secondary' ? 'Secondaire' : key === 'accent' ? 'Accent' : key === 'text' ? 'Texte' : 'Arrière-plan'}
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={value}
                          onChange={(e) =>
                            updateColors(key as keyof TemplateDesign['colors'], e.target.value)
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            updateColors(key as keyof TemplateDesign['colors'], e.target.value)
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Fonts Tab */}
            <TabsContent value="fonts" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  {Object.entries(design.fonts).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="font-semibold capitalize">
                        {key === 'title' ? 'Titre' : key === 'heading' ? 'Sous-titre' : 'Corps'}
                      </Label>
                      <div className="ml-4 space-y-2">
                        <div>
                          <Label>Taille (pt)</Label>
                          <Input
                            type="number"
                            value={value.size}
                            onChange={(e) =>
                              updateFonts(key as keyof TemplateDesign['fonts'], {
                                size: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Poids</Label>
                          <Select
                            value={value.weight}
                            onValueChange={(newWeight) =>
                              updateFonts(key as keyof TemplateDesign['fonts'], {
                                weight: newWeight,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="bold">Gras</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Marges de page (px)</Label>
                    <Input
                      type="number"
                      value={design.layout.pageMargin}
                      onChange={(e) => updateLayout('pageMargin', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Espacement entre sections (px)</Label>
                    <Input
                      type="number"
                      value={design.layout.sectionSpacing}
                      onChange={(e) =>
                        updateLayout('sectionSpacing', parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label>Arrondi des bordures (px)</Label>
                    <Input
                      type="number"
                      value={design.layout.borderRadius}
                      onChange={(e) => updateLayout('borderRadius', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Sauvegarde...' : 'Sauvegarder le design'}
          </Button>
        </div>

        {/* Preview Panel */}
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Aperçu</h3>
            <div
              className="border rounded-lg p-6 space-y-4 min-h-[600px]"
              style={{ backgroundColor: design.colors.background }}
            >
              {/* Logo */}
              {design.sections.logo.enabled && (
                <div
                  className="flex"
                  style={{
                    justifyContent:
                      design.sections.logo.position === 'center'
                        ? 'center'
                        : design.sections.logo.position === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                  }}
                >
                  <div
                    className="bg-muted flex items-center justify-center rounded"
                    style={{ width: design.sections.logo.size, height: design.sections.logo.size / 2 }}
                  >
                    <span className="text-xs text-muted-foreground">Logo</span>
                  </div>
                </div>
              )}

              {/* Header */}
              {design.sections.header.enabled && (
                <div>
                  <h1
                    style={{
                      color: design.colors.primary,
                      fontSize: `${design.fonts.title.size}px`,
                      fontWeight: design.fonts.title.weight,
                    }}
                  >
                    {design.sections.header.title}
                  </h1>
                  {design.sections.header.subtitle && (
                    <p
                      style={{
                        color: design.colors.secondary,
                        fontSize: `${design.fonts.heading.size}px`,
                      }}
                    >
                      {design.sections.header.subtitle}
                    </p>
                  )}
                </div>
              )}

              {/* Client Info */}
              {design.sections.clientInfo.enabled && (
                <div
                  className="space-y-1"
                  style={{ fontSize: `${design.fonts.body.size}px`, color: design.colors.text }}
                >
                  <p className="font-semibold">Client:</p>
                  {design.sections.clientInfo.fields.includes('name') && <p>John Doe</p>}
                  {design.sections.clientInfo.fields.includes('company') && <p>Entreprise ABC</p>}
                  {design.sections.clientInfo.fields.includes('email') && <p>john@example.com</p>}
                  {design.sections.clientInfo.fields.includes('phone') && <p>+32 123 456 789</p>}
                  {design.sections.clientInfo.fields.includes('address') && (
                    <p>123 Rue Example, Bruxelles</p>
                  )}
                </div>
              )}

              {/* Equipment Table */}
              {design.sections.equipmentTable.enabled && (
                <div className="border rounded" style={{ borderRadius: `${design.layout.borderRadius}px` }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: design.colors.primary, color: '#fff' }}>
                        <th className="p-2 text-left">Article</th>
                        <th className="p-2 text-center">Qté</th>
                        <th className="p-2 text-right">Prix</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2">MacBook Pro</td>
                        <td className="p-2 text-center">2</td>
                        <td className="p-2 text-right">50€/mois</td>
                        <td className="p-2 text-right">100€/mois</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              {design.sections.summary.enabled && (
                <div
                  className="border-t pt-4 space-y-2"
                  style={{ fontSize: `${design.fonts.body.size}px`, color: design.colors.text }}
                >
                  {design.sections.summary.showMonthly && (
                    <div className="flex justify-between font-bold text-base">
                      <span>Mensualité totale :</span>
                      <span>100€/mois</span>
                    </div>
                  )}
                  {design.sections.summary.showTotal && (
                    <div className="flex justify-between">
                      <span>Total sur 36 mois:</span>
                      <span className="font-semibold">3,600€</span>
                    </div>
                  )}
                  {design.sections.summary.showInsurance && (
                    <div className="flex justify-between font-bold text-sm mt-3">
                      <span>{design.sections.summary.insuranceLabel}</span>
                      <span> </span>
                    </div>
                  )}
                  {design.sections.summary.showProcessingFee && (
                    <div className="flex justify-end font-bold text-sm">
                      <span>
                        {design.sections.summary.processingFeeLabel} {design.sections.summary.processingFeeAmount}€ HTVA
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {design.sections.footer.enabled && (
                <div
                  className="text-center pt-4 border-t space-y-1"
                  style={{ fontSize: `${design.fonts.body.size}px`, color: design.colors.secondary }}
                >
                  {design.sections.footer.lines.filter(line => line && line.trim()).map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OfferTemplateDesigner;

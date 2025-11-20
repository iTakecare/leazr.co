import { useQuery } from "@tanstack/react-query";
import { getCategoryStats, getTopCategoryProducts } from "@/services/simplifiedCategoryService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CategoryStatsTabProps {
  categoryId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export function CategoryStatsTab({ categoryId }: CategoryStatsTabProps) {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["category-stats", categoryId],
    queryFn: () => getCategoryStats(categoryId),
    enabled: !!categoryId,
  });

  const { data: topProducts = [], isLoading: loadingTopProducts } = useQuery({
    queryKey: ["top-category-products", categoryId],
    queryFn: () => getTopCategoryProducts(categoryId, 10),
    enabled: !!categoryId,
  });

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune statistique disponible
      </div>
    );
  }

  // Données pour le graphique en camembert (actifs vs inactifs)
  const activeInactiveData = [
    { name: 'Actifs', value: stats.activeProducts },
    { name: 'Inactifs', value: stats.totalProducts - stats.activeProducts },
  ];

  // Données pour le graphique en barres (marques)
  const brandData = Object.entries(stats.brandDistribution || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([brand, count]) => ({
      name: brand,
      produits: count,
    }));

  // Données pour les valeurs
  const valueData = [
    { name: 'Valeur catalogue', value: Math.round(stats.totalCatalogValue) },
    { name: 'Valeur mensuelle', value: Math.round(stats.totalMonthlyValue) },
    { name: 'Moyenne/produit', value: Math.round(stats.totalCatalogValue / (stats.totalProducts || 1)) },
  ];

  return (
    <div className="space-y-8">
      {/* Section 1: Répartition des produits */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Répartition des produits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Actifs vs Inactifs */}
          <div className="border rounded-lg p-4 bg-card">
            <h4 className="text-sm font-medium mb-4">Statut des produits</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={activeInactiveData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activeInactiveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 marques */}
          {brandData.length > 0 && (
            <div className="border rounded-lg p-4 bg-card">
              <h4 className="text-sm font-medium mb-4">Top 5 marques</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={brandData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="produits" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Valeurs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Analyse des valeurs</h3>
        <div className="border rounded-lg p-4 bg-card">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={valueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}€`} />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 3: Top produits */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Top 10 produits (par prix)</h3>
        {loadingTopProducts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : topProducts.length > 0 ? (
          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Marque</TableHead>
                  <TableHead className="text-right">Prix d'achat</TableHead>
                  <TableHead className="text-right">Prix mensuel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-accent/20 rounded flex items-center justify-center text-xs text-muted-foreground">
                          N/A
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.brand_name || "N/A"}</TableCell>
                    <TableCell className="text-right">{product.purchase_price?.toFixed(2)}€</TableCell>
                    <TableCell className="text-right">{product.monthly_price?.toFixed(2)}€</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card">
            Aucun produit disponible
          </div>
        )}
      </div>
    </div>
  );
}

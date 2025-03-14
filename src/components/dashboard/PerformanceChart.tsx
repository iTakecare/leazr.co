
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTheme } from '@/components/providers/theme-provider';

const dummyData = [
  { name: 'Jan', revenue: 4000, margin: 2400 },
  { name: 'Fév', revenue: 3000, margin: 1800 },
  { name: 'Mar', revenue: 5000, margin: 3000 },
  { name: 'Avr', revenue: 2780, margin: 1500 },
  { name: 'Mai', revenue: 1890, margin: 1000 },
  { name: 'Jun', revenue: 2390, margin: 1300 },
  { name: 'Jul', revenue: 3490, margin: 2100 },
  { name: 'Aoû', revenue: 4000, margin: 2400 },
  { name: 'Sep', revenue: 4000, margin: 2400 },
  { name: 'Oct', revenue: 4000, margin: 2400 },
  { name: 'Nov', revenue: 4000, margin: 2400 },
  { name: 'Déc', revenue: 4000, margin: 2400 }
];

interface PerformanceChartProps {
  data?: any[];
  isLoading?: boolean;
}

export const PerformanceChart = ({ data = dummyData, isLoading = false }: PerformanceChartProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const textColor = isDark ? '#e2e8f0' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Performance</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center bg-muted/30 rounded-md">
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} />
                <YAxis stroke={textColor} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: textColor,
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Chiffre d'affaires" fill="#8884d8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="margin" name="Marge" fill="#82ca9d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

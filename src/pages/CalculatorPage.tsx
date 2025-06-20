
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainNavigation from '@/components/layout/MainNavigation';

const CalculatorPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('CalculatorPage is rendering');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <MainNavigation />
      
      <section className="pt-32 py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            🧮 Calculateur Intelligent
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Calculateur
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Intelligent Leasing
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Automatisez vos calculs de leasing avec notre moteur intelligent. 
            Générez instantanément des simulations précises et personnalisées.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Calculator className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-lg">Calcul Automatique</CardTitle>
                <CardDescription>Calculs instantanés et précis</CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                <CardTitle className="text-lg">Simulations Avancées</CardTitle>
                <CardDescription>Scénarios multiples en temps réel</CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <PieChart className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle className="text-lg">Analyse Financière</CardTitle>
                <CardDescription>Tableaux d'amortissement détaillés</CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <BarChart3 className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle className="text-lg">Reporting Complet</CardTitle>
                <CardDescription>Exportation et partage facilités</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Prêt à optimiser vos calculs de leasing ?
          </h2>
          <Button onClick={() => navigate('/signup')} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Essayer le calculateur
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CalculatorPage;

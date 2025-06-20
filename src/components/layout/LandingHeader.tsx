
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

const LandingHeader: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSolutionClick = (anchor?: string) => {
    if (anchor) {
      navigate('/solutions');
      setTimeout(() => {
        const element = document.getElementById(anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      navigate('/solutions');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <Logo variant="full" logoSize="md" showText={true} />
          </Link>

          {/* Navigation Desktop */}
          <div className="hidden lg:flex items-center space-x-8">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Solutions Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-slate-700 hover:text-blue-600 transition-colors">
                    💡 Solutions
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[600px] gap-3 p-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <h3 className="font-medium text-slate-900 mb-2">🧮 Outils de calcul</h3>
                        <NavigationMenuLink asChild>
                          <button 
                            onClick={() => handleSolutionClick('crm')}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-left w-full"
                          >
                            <div className="text-sm font-medium leading-none">🤝 CRM Intégré</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Gérez vos clients et prospects efficacement
                            </p>
                          </button>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <button 
                            onClick={() => handleSolutionClick('calculateur')}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-left w-full"
                          >
                            <div className="text-sm font-medium leading-none">📊 Calculateur Intelligent</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Automatisez vos calculs de leasing
                            </p>
                          </button>
                        </NavigationMenuLink>
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-medium text-slate-900 mb-2">🎯 Par segment</h3>
                        <NavigationMenuLink asChild>
                          <button 
                            onClick={() => handleSolutionClick('professionnels')}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-left w-full"
                          >
                            <div className="text-sm font-medium leading-none">💼 Professionnels</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Solutions pour PME et indépendants
                            </p>
                          </button>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <button 
                            onClick={() => handleSolutionClick('entreprises')}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-left w-full"
                          >
                            <div className="text-sm font-medium leading-none">🏢 Entreprises</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Solutions pour grandes entreprises
                            </p>
                          </button>
                        </NavigationMenuLink>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Services Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-slate-700 hover:text-blue-600 transition-colors">
                    🔧 Services
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-6">
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/services"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">🚀 Intégration</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Déploiement et formation
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/services"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">🆘 Support</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Assistance technique
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Ressources Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-slate-700 hover:text-blue-600 transition-colors">
                    📚 Ressources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-6">
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/ressources"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">📖 Documentation</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Guides et tutoriels
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/ressources"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">📝 Blog</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Actualités et conseils
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Menu simple */}
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link 
                      to="/tarifs"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 text-slate-700 hover:text-blue-600"
                    >
                      💰 Tarifs
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link 
                      to="/contact"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 text-slate-700 hover:text-blue-600"
                    >
                      📞 Contact
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                className="text-slate-700 hover:text-blue-600"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={() => navigate('/signup')}
              >
                Essai gratuit
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-6">
            <nav className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-900 mb-3">💡 Solutions</h3>
                <div className="space-y-2 ml-4">
                  <button 
                    onClick={() => handleSolutionClick('crm')}
                    className="block text-slate-600 hover:text-blue-600 transition-colors text-left"
                  >
                    🤝 CRM Intégré
                  </button>
                  <button 
                    onClick={() => handleSolutionClick('calculateur')}
                    className="block text-slate-600 hover:text-blue-600 transition-colors text-left"
                  >
                    📊 Calculateur Intelligent
                  </button>
                  <button 
                    onClick={() => handleSolutionClick('professionnels')}
                    className="block text-slate-600 hover:text-blue-600 transition-colors text-left"
                  >
                    💼 Professionnels
                  </button>
                  <button 
                    onClick={() => handleSolutionClick('entreprises')}
                    className="block text-slate-600 hover:text-blue-600 transition-colors text-left"
                  >
                    🏢 Entreprises
                  </button>
                </div>
              </div>
              
              <Link to="/services" className="block font-medium text-slate-700 hover:text-blue-600 transition-colors">
                🔧 Services
              </Link>
              <Link to="/ressources" className="block font-medium text-slate-700 hover:text-blue-600 transition-colors">
                📚 Ressources
              </Link>
              <Link to="/tarifs" className="block font-medium text-slate-700 hover:text-blue-600 transition-colors">
                💰 Tarifs
              </Link>
              <Link to="/contact" className="block font-medium text-slate-700 hover:text-blue-600 transition-colors">
                📞 Contact
              </Link>
              
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-slate-700 hover:text-blue-600"
                  onClick={() => navigate('/login')}
                >
                  Se connecter
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={() => navigate('/signup')}
                >
                  Essai gratuit
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default LandingHeader;

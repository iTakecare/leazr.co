
import React from 'react';
import Logo from './Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo et description */}
          <div className="md:col-span-1">
            <Logo variant="full" logoSize="lg" showText={false} className="mb-4" />
            <p className="text-slate-600 text-sm">
              💼 La solution métier de référence pour le leasing.
            </p>
          </div>

          {/* Colonne Solution */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
              <span className="bg-orange-100 text-orange-600 rounded p-1 mr-2 text-xs">📦</span>
              Solution
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center">
                <span className="mr-2">⚡</span>
                <a href="/solutions" className="hover:text-blue-600 transition-colors">Fonctionnalités</a>
              </li>
              <li className="flex items-center">
                <span className="mr-2">💰</span>
                <a href="/pricing" className="hover:text-blue-600 transition-colors">Tarifs</a>
              </li>
              <li className="flex items-center">
                <span className="mr-2">🔒</span>
                <a href="/solutions" className="hover:text-blue-600 transition-colors">Sécurité</a>
              </li>
            </ul>
          </div>

          {/* Colonne Support */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
              <span className="bg-red-100 text-red-600 rounded p-1 mr-2 text-xs">🆘</span>
              Support
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center">
                <span className="mr-2">📚</span>
                <a href="/ressources" className="hover:text-blue-600 transition-colors">Documentation</a>
              </li>
              <li className="flex items-center">
                <span className="mr-2">📞</span>
                <a href="/contact" className="hover:text-blue-600 transition-colors">Contact</a>
              </li>
              <li className="flex items-center">
                <span className="mr-2">🎓</span>
                <a href="/ressources" className="hover:text-blue-600 transition-colors">Formation</a>
              </li>
            </ul>
          </div>

          {/* Colonne Entreprise */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-600 rounded p-1 mr-2 text-xs">🏢</span>
              Entreprise
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center">
                <span className="mr-2">ℹ️</span>
                <a href="/about" className="hover:text-blue-600 transition-colors">À propos</a>
              </li>
              <li className="flex items-center">
                <span className="mr-2">📝</span>
                <a href="/ressources" className="hover:text-blue-600 transition-colors">Blog</a>
              </li>
              <li className="flex items-center">
                <span className="mr-2">💼</span>
                <a href="/about" className="hover:text-blue-600 transition-colors">Carrières</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-200 pt-6 text-center">
          <p className="text-slate-500 text-sm">
            © 2025 Leazr.co est un produit développé par{' '}
            <a 
              href="https://www.itakecare.be" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              iTakecare SRL
            </a>. 💙
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


import React from 'react';
import Logo from './Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo et description */}
          <div className="md:col-span-1">
            <Logo variant="full" logoSize="lg" showText={true} className="mb-4" />
            <p className="text-slate-600 text-sm">
              🏢 La solution métier de référence pour le leasing.
            </p>
          </div>

          {/* Colonne Solution */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              📦 Solution
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="/solutions#fonctionnalites" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  ⚡ Fonctionnalités
                </a>
              </li>
              <li>
                <a href="/tarifs" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  💰 Tarifs
                </a>
              </li>
              <li>
                <a href="/solutions#securite" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  🔒 Sécurité
                </a>
              </li>
            </ul>
          </div>

          {/* Colonne Support */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              🆘 Support
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="/ressources/documentation" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  📚 Documentation
                </a>
              </li>
              <li>
                <a href="/contact" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  📞 Contact
                </a>
              </li>
              <li>
                <a href="/services/formation" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  🎓 Formation
                </a>
              </li>
            </ul>
          </div>

          {/* Colonne Entreprise */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              🏢 Entreprise
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="/about" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  ℹ️ À propos
                </a>
              </li>
              <li>
                <a href="/ressources/blog" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  📝 Blog
                </a>
              </li>
              <li>
                <a href="/carrieres" className="text-slate-600 hover:text-blue-600 transition-colors text-sm flex items-center gap-2">
                  💼 Carrières
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center pt-8 border-t border-slate-200">
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

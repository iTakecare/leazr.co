
import React from 'react';
import Logo from './Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <Logo variant="full" logoSize="lg" showText={false} className="mb-4 mx-auto" />
          <p className="text-slate-600 mb-2">
            💼 La solution métier de référence pour le leasing.
          </p>
          <p className="text-slate-500 text-sm">
            © 2025 Leazr est un produit développé par{' '}
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

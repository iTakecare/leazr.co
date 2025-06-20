
import React from 'react';
import Logo from './Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <Logo variant="full" logoSize="lg" showText={false} className="mb-4 mx-auto" />
          <p className="text-slate-600">
            💼 La solution métier de référence pour le leasing.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

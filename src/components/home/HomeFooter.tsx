
import React from 'react';
import { Link } from 'react-router-dom';
import Container from "@/components/layout/Container";
import { Facebook, Instagram, Linkedin } from 'lucide-react';

const HomeFooter = () => {
  return (
    <footer className="w-full">
      {/* Section turquoise avec appel à l'action */}
      <div className="w-full bg-itakecare-turquoise py-16">
        <Container maxWidth="lg">
          <div className="max-w-4xl mx-auto bg-white/10 rounded-3xl p-8 shadow-lg">
            <div className="text-center text-white">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                Le leasing de matériel informatique<br />
                n'a plus de <span className="bg-[#33949F] px-4 py-1 rounded-full">secrets</span> pour vous
              </h2>
              
              <div className="flex flex-wrap justify-center gap-4 mt-10">
                <Link to="/catalogue" className="bg-[#33949F] hover:bg-[#2C8089] text-white font-medium px-6 py-3 rounded-full transition-all">
                  Découvrir le catalogue
                </Link>
                <Link to="/contact" className="bg-white hover:bg-gray-100 text-gray-800 font-medium px-6 py-3 rounded-full transition-all">
                  Parler à un conseiller
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>
      
      {/* Section du footer principal */}
      <div className="w-full bg-gray-50 py-12">
        <Container maxWidth="lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Colonne 1: Logo et description */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <img src="/lovable-uploads/b033606b-fbdc-40f1-8bdb-306a2c78ebdf.png" alt="iTakecare Logo" className="h-10" />
                <span className="text-2xl font-bold">
                  <span className="text-[#41A6B2]">i</span>
                  <span className="text-[#41A6B2]">take</span>
                  <span className="text-[#33638E]">care</span>
                </span>
              </div>
              <p className="text-gray-700 mb-6">
                Leasing de matériel informatique reconditionné sans contraites. 
                Optez pour un parc informatique performant et écoresponsable, à moindre coût:
              </p>
              <div className="flex space-x-3">
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" 
                   className="flex items-center justify-center w-10 h-10 rounded-full bg-[#41A6B2] text-white hover:bg-[#33638E] transition-colors">
                  <Facebook size={20} />
                </a>
                <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center w-10 h-10 rounded-full bg-[#41A6B2] text-white hover:bg-[#33638E] transition-colors">
                  <Linkedin size={20} />
                </a>
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center w-10 h-10 rounded-full bg-[#41A6B2] text-white hover:bg-[#33638E] transition-colors">
                  <Instagram size={20} />
                </a>
              </div>
            </div>
            
            {/* Colonne 2: Catalogue */}
            <div className="md:col-span-1">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Catalogue</h3>
              <ul className="space-y-2">
                <li><Link to="/catalogue/ordinateurs" className="text-gray-700 hover:text-itakecare-primary">Lorem</Link></li>
                <li><Link to="/catalogue/ecrans" className="text-gray-700 hover:text-itakecare-primary">Lorem</Link></li>
                <li><Link to="/catalogue/peripheriques" className="text-gray-700 hover:text-itakecare-primary">Lorem</Link></li>
                <li><Link to="/catalogue/serveurs" className="text-gray-700 hover:text-itakecare-primary">Lorem</Link></li>
                <li><Link to="/catalogue/reseau" className="text-gray-700 hover:text-itakecare-primary">Lorem</Link></li>
              </ul>
            </div>
            
            {/* Colonne 3: À propos */}
            <div className="md:col-span-1">
              <h3 className="text-xl font-bold mb-4 text-gray-800">À propos</h3>
              <ul className="space-y-2">
                <li><Link to="/a-propos" className="text-gray-700 hover:text-itakecare-primary">Lorem</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} iTakecare. Tous droits réservés.
          </div>
        </Container>
      </div>
    </footer>
  );
};

export default HomeFooter;

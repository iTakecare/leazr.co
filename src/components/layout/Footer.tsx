
import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Footer = () => {
  return (
    <footer className="bg-[#33638E] text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img
                src="/lovable-uploads/3a4ae1ec-2b87-4a07-a178-b3bc5d86594b.png"
                alt="iTakecare Logo"
                className="h-12 object-contain"
              />
            </Link>
            <p className="text-gray-300 mb-6 max-w-md">
              Des solutions informatiques durables pour les entreprises modernes. Location, maintenance et gestion de matériel informatique avec un impact environnemental réduit.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-[#48b5c3] transition-colors">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-white hover:text-[#48b5c3] transition-colors">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-white hover:text-[#48b5c3] transition-colors">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-white hover:text-[#48b5c3] transition-colors">
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Solutions</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/solutions/location" className="text-gray-300 hover:text-white transition-colors">
                  Location d'équipement
                </Link>
              </li>
              <li>
                <Link to="/solutions/gestion-parc" className="text-gray-300 hover:text-white transition-colors">
                  Gestion de parc
                </Link>
              </li>
              <li>
                <Link to="/solutions/cloud" className="text-gray-300 hover:text-white transition-colors">
                  Services cloud
                </Link>
              </li>
              <li>
                <Link to="/solutions/reconditionnement" className="text-gray-300 hover:text-white transition-colors">
                  Reconditionnement
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services/entreprises" className="text-gray-300 hover:text-white transition-colors">
                  Pour entreprises
                </Link>
              </li>
              <li>
                <Link to="/services/professionnels" className="text-gray-300 hover:text-white transition-colors">
                  Pour professionnels
                </Link>
              </li>
              <li>
                <Link to="/services/formations" className="text-gray-300 hover:text-white transition-colors">
                  Formations
                </Link>
              </li>
              <li>
                <Link to="/services/support" className="text-gray-300 hover:text-white transition-colors">
                  Support technique
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">À propos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/durabilite" className="text-gray-300 hover:text-white transition-colors">
                  Durabilité
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-300 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                  Espace client
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} iTakecare. Tous droits réservés.
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link to="/mentions-legales" className="text-gray-400 hover:text-white transition-colors">
                Mentions légales
              </Link>
              <Link to="/politique-confidentialite" className="text-gray-400 hover:text-white transition-colors">
                Politique de confidentialité
              </Link>
              <Link to="/conditions-utilisation" className="text-gray-400 hover:text-white transition-colors">
                Conditions d'utilisation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

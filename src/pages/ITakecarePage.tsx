
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ITakecarePack from "@/components/packs/itakecare-pack";
import { Link } from "react-router-dom";

const ITakecarePage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">iTakecare</h1>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link to="/" className="text-gray-700 hover:text-blue-700">Accueil</Link>
              <Link to="/login" className="text-gray-700 hover:text-blue-700">Connexion</Link>
              <Link to="/signup" className="text-gray-700 hover:text-blue-700">Inscription</Link>
            </nav>
          </div>
        </header>
        <main>
          <Container>
            <ITakecarePack />
          </Container>
        </main>
      </div>
    </PageTransition>
  );
};

export default ITakecarePage;

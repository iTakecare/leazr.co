
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon } from "lucide-react";

const CalculatorPage = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <CalcIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Calculateur de Mensualités
              </h1>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <p className="text-gray-600">
                Cette page contiendra le calculateur de mensualités. 
                Fonctionnalité à implémenter.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default CalculatorPage;

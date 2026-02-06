import React from 'react';
import { AlertTriangle } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
          Servidor em Manutenção
        </h1>
        <p className="text-gray-600 text-lg">
          O servidor precisa de renovação. Voltaremos em breve!
        </p>
      </div>
    </div>
  );
};

export default Index;

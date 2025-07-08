
import React from 'react';
import { Trophy, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-lg bg-background/95">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold golden-text">PIX Fortuna</h1>
              <p className="text-xs text-muted-foreground">Mobile</p>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#home" className="text-foreground hover:text-primary transition-colors">Início</a>
            <a href="#sorteios" className="text-foreground hover:text-primary transition-colors">Sorteios</a>
            <a href="#ganhadores" className="text-foreground hover:text-primary transition-colors">Ganhadores</a>
            <a href="#como-funciona" className="text-foreground hover:text-primary transition-colors">Como Funciona</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <User className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            <Button size="sm" className="md:hidden">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

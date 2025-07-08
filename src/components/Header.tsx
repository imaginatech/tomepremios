
import React, { useState } from 'react';
import { Trophy, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

const Header = () => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  return (
    <>
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

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" alt={user.email || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.email || 'US')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm text-muted-foreground max-w-32 truncate">
                    {user.email}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={signOut}
                    className="hidden sm:flex"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center"
                >
                  <User className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default Header;


import React, { useState, useEffect } from 'react';
import { Trophy, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from './AuthModal';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  affiliateCode?: string | null;
}

const Header: React.FC<HeaderProps> = ({ affiliateCode }) => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (!error && data?.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleAvatarClick = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-lg bg-background/95">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={handleHomeClick}>
              <img 
                src="/lovable-uploads/b3c4a522-910c-4501-89cc-c9228e15ab49.png" 
                alt="Tome prêmios Logo" 
                className="h-12 w-auto"
              />
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/#home" className="text-foreground hover:text-primary transition-colors">Início</a>
              <a href="/#sorteios" className="text-foreground hover:text-primary transition-colors">Sorteios</a>
              <a href="/#ganhadores" className="text-foreground hover:text-primary transition-colors">Ganhadores</a>
              <a href="/#como-funciona" className="text-foreground hover:text-primary transition-colors">Como Funciona</a>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleAvatarClick}>
                    <AvatarImage src="" alt={user.email || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.email || 'US')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm text-muted-foreground max-w-32 truncate">
                    {user.email}
                  </span>
                  {location.pathname !== '/dashboard' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDashboardClick}
                      className="hidden sm:flex"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Painel
                    </Button>
                  )}
                  {isAdmin && location.pathname !== '/admin' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAdminClick}
                      className="hidden sm:flex"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  )}
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
        affiliateCode={affiliateCode}
      />
    </>
  );
};

export default Header;

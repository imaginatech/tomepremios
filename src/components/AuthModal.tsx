
import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  if (!isOpen) return null;

  const formatWhatsApp = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (XX) X XXXX-XXXX
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 3) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isLogin && password !== confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem",
          variant: "destructive",
        });
        return;
      }

      if (password.length < 6) {
        toast({
          title: "Erro",
          description: "A senha deve ter pelo menos 6 caracteres",
          variant: "destructive",
        });
        return;
      }

      if (!isLogin) {
        if (!fullName.trim()) {
          toast({
            title: "Erro",
            description: "Por favor, insira seu nome completo",
            variant: "destructive",
          });
          return;
        }

        if (whatsapp.replace(/\D/g, '').length !== 11) {
          toast({
            title: "Erro",
            description: "Por favor, insira um número de WhatsApp válido",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password, fullName, whatsapp);

      if (error) {
        let errorMessage = "Ocorreu um erro. Tente novamente.";
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
        } else if (error.message.includes('User already registered')) {
          errorMessage = "Este email já está cadastrado. Faça login.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Confirme seu email antes de fazer login.";
        }

        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        if (!isLogin) {
          toast({
            title: "Sucesso!",
            description: "Cadastro realizado com sucesso! Você já pode participar dos sorteios.",
          });
        } else {
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso!",
          });
        }
        onSuccess();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold golden-text">
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="(00) 0 0000-0000"
                  value={whatsapp}
                  onChange={handleWhatsAppChange}
                  className="pl-10"
                  maxLength={16}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full btn-pix text-white"
            disabled={loading}
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <User className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          </p>
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-primary/80"
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

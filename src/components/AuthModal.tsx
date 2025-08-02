
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  affiliateCode?: string | null;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, affiliateCode: propAffiliateCode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();

  // Verificar se há código de afiliado na URL ou recebido como prop
  useEffect(() => {
    console.log('🔗 AuthModal - Verificando código de afiliado:', {
      propAffiliateCode,
      currentURL: window.location.href,
      searchParams: window.location.search,
      isModalOpen: isOpen
    });

    if (propAffiliateCode) {
      console.log('✅ AuthModal - Usando código recebido como prop:', propAffiliateCode);
      setAffiliateCode(propAffiliateCode);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      console.log('🔍 AuthModal - Buscando parâmetro ref na URL:', refCode);
      if (refCode) {
        console.log('✅ AuthModal - Código encontrado na URL:', refCode);
        setAffiliateCode(refCode);
      } else {
        console.log('❌ AuthModal - Nenhum código de afiliado encontrado');
      }
    }
  }, [propAffiliateCode, isOpen]);

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
    
    // Limpar erro de WhatsApp quando usuário digita
    if (whatsappError) {
      setWhatsappError('');
    }
  };

  const checkWhatsAppExists = async (whatsappNumber: string) => {
    if (!whatsappNumber || whatsappNumber.replace(/\D/g, '').length < 11) {
      return false;
    }

    try {
      const cleanWhatsApp = whatsappNumber.replace(/\D/g, '');
      
      const { data: existingProfiles, error } = await supabase
        .from('profiles')
        .select('id, whatsapp')
        .not('whatsapp', 'is', null);

      if (!error && existingProfiles) {
        const duplicateProfile = existingProfiles.find(profile => {
          if (!profile.whatsapp) return false;
          const existingCleanWhatsApp = profile.whatsapp.replace(/\D/g, '');
          return existingCleanWhatsApp === cleanWhatsApp;
        });

        return !!duplicateProfile;
      }
    } catch (error) {
      console.error('Erro ao verificar WhatsApp:', error);
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Se for recuperação de senha
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        
        if (error) {
          toast({
            title: "Erro",
            description: "Erro ao enviar email de recuperação. Verifique se o email está correto.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Email enviado!",
            description: "Verifique sua caixa de entrada para redefinir sua senha.",
          });
          setIsForgotPassword(false);
          setIsLogin(true);
        }
        return;
      }

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

        // Verificar se WhatsApp já existe antes de tentar cadastrar
        const whatsappExists = await checkWhatsAppExists(whatsapp);
        if (whatsappExists) {
          setWhatsappError('Este número já está cadastrado');
          toast({
            title: "WhatsApp já cadastrado",
            description: "Este número já está cadastrado. Faça login para acessar sua conta.",
            variant: "destructive",
          });
          setIsLogin(true); // Mudar para modo login
          return;
        }
      }

      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        // Incluir código de afiliado diretamente no cadastro
        result = await signUp(email, password, fullName, whatsapp, affiliateCode);
        
        // Log do resultado para debug
        console.log('🎯 AuthModal - Resultado do cadastro:', {
          success: !result.error,
          hasAffiliateCode: !!affiliateCode,
          affiliateCode: affiliateCode?.trim().toUpperCase(),
          userEmail: email,
          userData: result.data?.user
        });

        if (affiliateCode && !result.error) {
          console.log('✅ AuthModal - Cadastro realizado com código de afiliado!');
          toast({
            title: "Indicação registrada!",
            description: "Você foi indicado por um afiliado e receberá benefícios especiais.",
          });
        } else if (affiliateCode && result.error) {
          console.log('⚠️ AuthModal - Código de afiliado presente mas cadastro falhou', {
            affiliateCode,
            error: result.error
          });
        } else if (!affiliateCode) {
          console.log('ℹ️ AuthModal - Cadastro realizado sem código de afiliado');
        }
      }

      const { error } = result;

      if (error) {
        let errorMessage = "Ocorreu um erro. Tente novamente.";
        let errorTitle = "Erro";
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
        } else if (error.message.includes('User already registered')) {
          errorMessage = "Este email já está cadastrado. Faça login para acessar sua conta.";
          errorTitle = "Usuário já cadastrado";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Confirme seu email antes de fazer login.";
        } else if (error.code === 'whatsapp_already_exists') {
          errorMessage = error.message;
          errorTitle = "WhatsApp já cadastrado";
          // Alternar para modo login
          setIsLogin(true);
        } else if (error.code === 'email_already_exists') {
          errorMessage = error.message;
          errorTitle = "Email já cadastrado";
          // Alternar para modo login
          setIsLogin(true);
        }

        toast({
          title: errorTitle,
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
            {isForgotPassword ? 'Recuperar Senha' : isLogin ? 'Entrar' : 'Cadastrar'}
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

          {isForgotPassword && (
            <p className="text-sm text-muted-foreground">
              Digite seu email para receber um link de recuperação de senha.
            </p>
          )}

          {!isLogin && !isForgotPassword && (
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

          {!isLogin && !isForgotPassword && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="(00) 0 0000-0000"
                  value={whatsapp}
                  onChange={handleWhatsAppChange}
                  className={`pl-10 ${whatsappError ? 'border-destructive' : ''}`}
                  maxLength={16}
                  required
                />
              </div>
              {whatsappError && (
                <p className="text-sm text-destructive">{whatsappError}</p>
              )}
            </div>
          )}

          {!isForgotPassword && (
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
          )}

          {!isLogin && !isForgotPassword && (
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

          {!isLogin && !isForgotPassword && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Código de Indicação (opcional)</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Código do afiliado que te indicou"
                  value={affiliateCode}
                  onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
                {affiliateCode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Você foi indicado pelo código: {affiliateCode}
                  </p>
                )}
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
            {loading ? 'Aguarde...' : isForgotPassword ? 'Enviar Email' : isLogin ? 'Entrar' : 'Cadastrar'}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {!isForgotPassword && (
            <>
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
            </>
          )}
          
          {isLogin && !isForgotPassword && (
            <Button
              variant="link"
              onClick={() => setIsForgotPassword(true)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Esqueceu sua senha?
            </Button>
          )}
          
          {isForgotPassword && (
            <Button
              variant="link"
              onClick={() => {
                setIsForgotPassword(false);
                setIsLogin(true);
              }}
              className="text-primary hover:text-primary/80"
            >
              Voltar ao login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;


import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string, whatsapp?: string, affiliateCode?: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string, whatsapp?: string, affiliateCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    console.log('Signing up with data:', { email, fullName, whatsapp, affiliateCode });
    
    // Verificar se já existe usuário com este WhatsApp
    try {
      if (whatsapp) {
        // Normalizar o número removendo formatação para comparação
        const cleanWhatsApp = whatsapp.replace(/\D/g, '');
        
        // Buscar por números com ou sem formatação
        const { data: existingProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, whatsapp')
          .not('whatsapp', 'is', null);

        if (!profileError && existingProfiles) {
          // Verificar se algum perfil tem o mesmo WhatsApp (comparando apenas números)
          const duplicateProfile = existingProfiles.find(profile => {
            if (!profile.whatsapp) return false;
            const existingCleanWhatsApp = profile.whatsapp.replace(/\D/g, '');
            return existingCleanWhatsApp === cleanWhatsApp;
          });

          if (duplicateProfile) {
            return { 
              data: null, 
              error: { 
                message: 'Este número de WhatsApp já está cadastrado. Faça login para acessar sua conta.',
                code: 'whatsapp_already_exists'
              } 
            };
          }
        }
      }
    } catch (checkError) {
      console.log('Erro na verificação de duplicatas:', checkError);
      // Continuar com o cadastro mesmo se a verificação falhou
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          whatsapp: whatsapp,
          referred_by: affiliateCode?.trim().toUpperCase()
        }
      }
    });
    
    console.log('SignUp result:', { data, error });
    return { data, error };
  };

  const signOut = async () => {
    try {
      console.log('Iniciando logout...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao fazer logout:', error);
        throw error;
      }
      console.log('Logout realizado com sucesso');
      
      // Força o redirecionamento para a página inicial
      window.location.href = '/';
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

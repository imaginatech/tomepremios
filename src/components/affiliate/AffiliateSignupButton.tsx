import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, CheckCircle } from 'lucide-react';

interface AffiliateSignupButtonProps {
  onSuccess?: (affiliateCode: string) => void;
}

const AffiliateSignupButton = ({ onSuccess }: AffiliateSignupButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleBecomeAffiliate = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Verificar se já é afiliado
      const { data: existingAffiliate } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('user_id', user.id)
        .single();

      if (existingAffiliate) {
        toast({
          title: "Você já é um afiliado!",
          description: `Seu código de afiliado é: ${existingAffiliate.affiliate_code}`,
        });
        onSuccess?.(existingAffiliate.affiliate_code);
        return;
      }

      // Gerar código de afiliado
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_affiliate_code');

      if (codeError) throw codeError;

      // Criar registro de afiliado
      const { error: insertError } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          affiliate_code: codeData,
          status: 'active'
        });

      if (insertError) throw insertError;

      toast({
        title: "Parabéns! Você agora é um afiliado!",
        description: `Seu código de afiliado é: ${codeData}`,
      });

      onSuccess?.(codeData);
    } catch (error: any) {
      console.error('Erro ao se tornar afiliado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível torná-lo um afiliado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBecomeAffiliate}
      disabled={isLoading}
      className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white font-medium"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      ) : (
        <UserPlus className="w-4 h-4 mr-2" />
      )}
      {isLoading ? 'Processando...' : 'Tornar-se Afiliado'}
    </Button>
  );
};

export default AffiliateSignupButton;
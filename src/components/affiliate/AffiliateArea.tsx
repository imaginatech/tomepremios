import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Users, Gift, TrendingUp, ExternalLink } from 'lucide-react';

interface AffiliateData {
  id: string;
  affiliate_code: string;
  status: string;
  created_at: string;
}

interface ReferralData {
  id: string;
  referred_user_id: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

interface BonusNumber {
  id: string;
  raffle_id: string;
  bonus_numbers: number[];
  created_at: string;
  raffles: {
    title: string;
  } | null;
}

const AffiliateArea = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [bonusNumbers, setBonusNumbers] = useState<BonusNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    try {
      // Buscar dados do afiliado
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (affiliateError && affiliateError.code !== 'PGRST116') {
        throw affiliateError;
      }

      setAffiliateData(affiliate);

      if (affiliate) {
        // Buscar indicações
        const { data: referralsData, error: referralsError } = await supabase
          .from('affiliate_referrals')
          .select(`
            id,
            referred_user_id,
            status,
            created_at,
            raffle_id
          `)
          .eq('affiliate_id', affiliate.id)
          .order('created_at', { ascending: false });

        if (referralsError) throw referralsError;

        // Buscar nomes dos usuários indicados separadamente
        const enrichedReferrals = await Promise.all(
          (referralsData || []).map(async (referral) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', referral.referred_user_id)
              .single();
            
            return {
              ...referral,
              profiles: profile
            };
          })
        );

        setReferrals(enrichedReferrals);

        // Buscar números bônus
        const { data: bonusData, error: bonusError } = await supabase
          .from('affiliate_bonus_numbers')
          .select(`
            *,
            raffles (
              title
            )
          `)
          .eq('affiliate_id', affiliate.id)
          .order('created_at', { ascending: false });

        if (bonusError) throw bonusError;
        setBonusNumbers(bonusData || []);
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados do afiliado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do afiliado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAffiliateLink = () => {
    if (!affiliateData) return;
    
    const baseUrl = window.location.origin;
    const affiliateLink = `${baseUrl}?ref=${affiliateData.affiliate_code}`;
    
    navigator.clipboard.writeText(affiliateLink);
    toast({
      title: "Link copiado!",
      description: "O link de afiliado foi copiado para a área de transferência.",
    });
  };

  const shareAffiliateLink = () => {
    if (!affiliateData) return;
    
    const baseUrl = window.location.origin;
    const affiliateLink = `${baseUrl}?ref=${affiliateData.affiliate_code}`;
    const text = "Participe dos sorteios mais incríveis! Use meu link de afiliado:";
    
    if (navigator.share) {
      navigator.share({
        title: 'Participe dos Sorteios',
        text: text,
        url: affiliateLink,
      });
    } else {
      // Fallback para WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${affiliateLink}`)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Programa de Afiliados
          </CardTitle>
          <CardDescription>
            Você ainda não é um afiliado. Para se tornar um afiliado, você precisa fazer uma compra primeiro.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const participantReferrals = referrals.filter(r => r.status === 'participant').length;
  const registeredReferrals = referrals.filter(r => r.status === 'registered').length;
  const totalBonusNumbers = bonusNumbers.reduce((acc, bonus) => acc + bonus.bonus_numbers.length, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Indicações</p>
                <p className="text-2xl font-bold">{referrals.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Participantes</p>
                <p className="text-2xl font-bold text-green-600">{participantReferrals}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Números Bônus</p>
                <p className="text-2xl font-bold text-blue-600">{totalBonusNumbers}</p>
              </div>
              <Gift className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Link de Afiliado */}
      <Card>
        <CardHeader>
          <CardTitle>Seu Link de Afiliado</CardTitle>
          <CardDescription>
            Compartilhe este link para ganhar números bônus a cada nova indicação que fizer uma compra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={`${window.location.origin}?ref=${affiliateData.affiliate_code}`}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyAffiliateLink} variant="outline" size="icon">
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={shareAffiliateLink} variant="outline" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Seu código:</span>
            <Badge variant="secondary" className="font-mono">
              {affiliateData.affiliate_code}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Indicações */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Indicações</CardTitle>
          <CardDescription>
            Acompanhe o status das pessoas que se cadastraram com seu link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma indicação ainda. Compartilhe seu link para começar!
            </p>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {referral.profiles?.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Indicado em {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge 
                    variant={referral.status === 'participant' ? 'default' : 'destructive'}
                    className={referral.status === 'participant' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {referral.status === 'participant' ? 'Participante' : 'Não participante'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Números Bônus */}
      {bonusNumbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Números Bônus Ganhos</CardTitle>
            <CardDescription>
              Números que você ganhou através das suas indicações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bonusNumbers.map((bonus) => (
                <div key={bonus.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{bonus.raffles?.title || 'Sorteio'}</h4>
                    <Badge variant="outline">
                      {bonus.bonus_numbers.length} número{bonus.bonus_numbers.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bonus.bonus_numbers.map((number) => (
                      <Badge key={number} variant="secondary" className="font-mono">
                        {number.toString().padStart(3, '0')}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ganho em {new Date(bonus.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AffiliateArea;
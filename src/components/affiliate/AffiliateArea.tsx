import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Users, Gift, TrendingUp, ExternalLink } from 'lucide-react';
import AffiliateSignupButton from './AffiliateSignupButton';

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

interface WeeklyStats {
  current_week_referrals: number;
  current_rank: number | null;
  total_referrals: number;
}

const AffiliateArea = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ current_week_referrals: 0, current_rank: null, total_referrals: 0 });
  const [loading, setLoading] = useState(true);
  const [hasPurchase, setHasPurchase] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    try {
      // Verificar se o usuário já fez uma compra primeiro
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('raffle_tickets')
        .select('id')
        .eq('user_id', user?.id)
        .eq('payment_status', 'paid')
        .limit(1);

      if (purchaseError) throw purchaseError;
      setHasPurchase((purchaseData || []).length > 0);

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

        // Calcular estatísticas da semana atual
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);

        const currentWeekReferrals = enrichedReferrals.filter(r => 
          r.status === 'participant' && 
          new Date(r.created_at) >= currentWeekStart
        ).length;

        const totalValidReferrals = enrichedReferrals.filter(r => r.status === 'participant').length;

        // Buscar ranking atual do afiliado
        const { data: rankingData } = await supabase
          .from('affiliate_referrals')
          .select(`
            affiliate_id,
            affiliates!inner (affiliate_code)
          `)
          .eq('status', 'participant')
          .gte('week_start', currentWeekStart.toISOString().split('T')[0]);

        // Calcular ranking
        const affiliateStats: { [key: string]: number } = {};
        rankingData?.forEach((referral: any) => {
          const affiliateId = referral.affiliate_id;
          affiliateStats[affiliateId] = (affiliateStats[affiliateId] || 0) + 1;
        });

        const sortedAffiliates = Object.entries(affiliateStats)
          .sort(([,a], [,b]) => b - a)
          .map(([id], index) => ({ id, rank: index + 1 }));

        const currentRank = sortedAffiliates.find(item => item.id === affiliate.id)?.rank || null;

        setWeeklyStats({
          current_week_referrals: currentWeekReferrals,
          current_rank: currentRank,
          total_referrals: totalValidReferrals
        });
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
            {hasPurchase 
              ? "Parabéns por ter participado de um sorteio! Agora você pode se tornar um afiliado e competir semanalmente pelo prêmio de R$ 500,00."
              : "Você ainda não é um afiliado. Para se tornar um afiliado, você precisa fazer uma compra primeiro."
            }
          </CardDescription>
        </CardHeader>
        {hasPurchase && (
          <CardContent>
            <AffiliateSignupButton onSuccess={() => fetchAffiliateData()} />
          </CardContent>
        )}
      </Card>
    );
  }

  const participantReferrals = referrals.filter(r => r.status === 'participant').length;
  const registeredReferrals = referrals.filter(r => r.status === 'registered').length;

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
                <p className="text-sm text-muted-foreground">Indicações Válidas</p>
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
                <p className="text-sm text-muted-foreground">Ranking Semanal</p>
                <p className="text-2xl font-bold text-blue-600">
                  {weeklyStats.current_rank ? `#${weeklyStats.current_rank}` : '-'}
                </p>
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
            Compartilhe este link para ganhar pontos no ranking semanal. O 1º lugar ganha R$ 500,00!
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
            Acompanhe suas indicações. Você ganha pontos apenas quando o indicado compra um título.
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
                     variant={referral.status === 'participant' ? 'default' : 'secondary'}
                     className={referral.status === 'participant' ? 'bg-green-600 hover:bg-green-700' : ''}
                   >
                     {referral.status === 'participant' ? '✓ Comprou' : '⏳ Cadastrado'}
                   </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Semanais */}
      <Card>
        <CardHeader>
          <CardTitle>Seu Desempenho Semanal</CardTitle>
          <CardDescription>
            Acompanhe sua posição na competição semanal pelo prêmio de R$ 500,00.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{weeklyStats.current_week_referrals}</p>
              <p className="text-sm text-muted-foreground">Indicações esta semana</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {weeklyStats.current_rank ? `#${weeklyStats.current_rank}` : '-'}
              </p>
              <p className="text-sm text-muted-foreground">Posição atual</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{weeklyStats.total_referrals}</p>
              <p className="text-sm text-muted-foreground">Total de indicações válidas</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-medium text-primary mb-2">🏆 Prêmio Semanal</h4>
            <p className="text-sm text-muted-foreground mb-2">
              O afiliado com mais indicações válidas da semana ganha R$ 500,00 via PIX!
            </p>
            <p className="text-xs text-muted-foreground">
              Premiação automática toda sexta-feira às 20h. A contagem reinicia aos domingos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateArea;
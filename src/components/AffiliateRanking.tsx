import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Award, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateRanking {
  affiliate_id: string;
  affiliate_code: string;
  referrals_count: number;
  user_name: string | null;
  rank: number;
}

const AffiliateRanking = () => {
  const [rankings, setRankings] = useState<AffiliateRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekPeriod, setWeekPeriod] = useState<string>('');

  useEffect(() => {
    fetchWeeklyRanking();
  }, []);

  const fetchWeeklyRanking = async () => {
    try {
      // Calcular início e fim da semana atual
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      currentWeekEnd.setHours(23, 59, 59, 999);

      setWeekPeriod(`${currentWeekStart.toLocaleDateString('pt-BR')} - ${currentWeekEnd.toLocaleDateString('pt-BR')}`);

      // Buscar indicações válidas da semana atual
      const { data: weeklyReferrals, error } = await supabase
        .from('affiliate_referrals')
        .select(`
          affiliate_id,
          created_at,
          affiliates!inner (
            affiliate_code,
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .eq('status', 'participant')
        .gte('week_start', currentWeekStart.toISOString().split('T')[0])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar e contar indicações por afiliado
      const affiliateStats: { [key: string]: AffiliateRanking } = {};

      weeklyReferrals?.forEach((referral: any) => {
        const affiliateId = referral.affiliate_id;
        const affiliateCode = referral.affiliates.affiliate_code;
        const userName = referral.affiliates.profiles?.full_name;

        if (!affiliateStats[affiliateId]) {
          affiliateStats[affiliateId] = {
            affiliate_id: affiliateId,
            affiliate_code: affiliateCode,
            referrals_count: 0,
            user_name: userName,
            rank: 0
          };
        }
        affiliateStats[affiliateId].referrals_count++;
      });

      // Converter para array e ordenar por número de indicações (decrescente)
      const sortedRankings = Object.values(affiliateStats)
        .sort((a, b) => b.referrals_count - a.referrals_count)
        .slice(0, 5) // Top 5
        .map((item, index) => ({
          ...item,
          rank: index + 1
        }));

      setRankings(sortedRankings);
    } catch (error) {
      console.error('Erro ao buscar ranking semanal:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Trophy className="w-5 h-5 text-amber-600" />;
      default:
        return <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">{rank}</Badge>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-amber-400 to-amber-600';
      default:
        return 'from-muted to-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top Afiliados da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Top Afiliados da Semana
        </CardTitle>
        <CardDescription>
          {weekPeriod && `Período: ${weekPeriod}`}
          <br />
          <span className="text-primary font-medium">🏆 1º lugar ganha R$ 500,00 toda sexta-feira às 20h!</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rankings.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhuma indicação válida registrada esta semana.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Seja o primeiro a indicar alguém que compre um título!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((affiliate) => (
              <div
                key={affiliate.affiliate_id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  affiliate.rank === 1 
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 dark:from-yellow-950 dark:to-yellow-900 dark:border-yellow-800' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-center">
                  {getRankIcon(affiliate.rank)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {affiliate.user_name || 'Afiliado'}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    #{affiliate.affiliate_code}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-lg">
                      {affiliate.referrals_count}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    indicação{affiliate.referrals_count !== 1 ? 'ões' : ''}
                  </p>
                </div>
                
                {affiliate.rank === 1 && (
                  <div className="text-center">
                    <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900">
                      Líder
                    </Badge>
                    <p className="text-xs text-yellow-600 font-medium mt-1">
                      R$ 500,00
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-medium text-primary mb-2">Como funciona?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Indique pessoas usando seu link de afiliado</li>
            <li>• Ganhe 1 ponto por cada indicado que comprar um título</li>
            <li>• O 1º lugar da semana ganha R$ 500,00 via PIX</li>
            <li>• Premiação automática toda sexta-feira às 20h</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateRanking;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Ticket, Calendar, TrendingUp, Award, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  totalParticipations: number;
  totalWins: number;
  totalPrizeValue: number;
  activeParticipations: number;
  memberSince: string;
}

const UserStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalParticipations: 0,
    totalWins: 0,
    totalPrizeValue: 0,
    activeParticipations: 0,
    memberSince: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      // Buscar todas as apostas (substituindo raffle_tickets)
      const { data: allBets, error: betsError } = await supabase
        .from('raffle_bets')
        .select('*, raffles(*)')
        .eq('user_id', user?.id)
        .neq('status', 'pending'); // Apenas apostas confirmadas

      if (betsError) {
        console.error('Error fetching bets:', betsError);
        return;
      }

      // Buscar vitórias
      const { data: allWins, error: winsError } = await supabase
        .from('raffle_winners')
        .select('*')
        .eq('user_id', user?.id);

      if (winsError) {
        console.error('Error fetching wins:', winsError);
      }

      // Calcular estatísticas
      const uniqueRaffles = new Set();
      let activeParticipations = 0;

      (allBets || []).forEach(bet => {
        const raffle = bet.raffles;
        if (raffle) {
          uniqueRaffles.add(raffle.id);

          if (raffle.status === 'active') {
            activeParticipations++;
          }
        }
      });

      const totalWins = allWins?.length || 0;
      const totalPrizeValue = allWins?.reduce((sum, win) => sum + Number(win.prize_amount), 0) || 0;

      setStats({
        totalParticipations: uniqueRaffles.size,
        totalWins,
        totalPrizeValue,
        activeParticipations,
        memberSince: user?.created_at || ''
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatItem = ({ icon: Icon, title, value, subtitle }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
  }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-lg font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Minhas Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
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
          <TrendingUp className="w-5 h-5" />
          Minhas Estatísticas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatItem
          icon={Target}
          title="Participações"
          value={stats.totalParticipations}
          subtitle="edições diferentes"
        />

        <StatItem
          icon={Trophy}
          title="Vitórias"
          value={stats.totalWins}
          subtitle={stats.totalWins > 0 ? `${((stats.totalWins / stats.totalParticipations) * 100).toFixed(1)}% de sucesso` : undefined}
        />

        <StatItem
          icon={Award}
          title="Prêmios Ganhos"
          value={`R$ ${stats.totalPrizeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="valor total"
        />

        <StatItem
          icon={Calendar}
          title="Participações Ativas"
          value={stats.activeParticipations}
          subtitle="em andamento"
        />
      </CardContent>
    </Card>
  );
};

export default UserStats;

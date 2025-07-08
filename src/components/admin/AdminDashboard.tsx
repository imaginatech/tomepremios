
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Target,
  Ticket
} from 'lucide-react';

interface DashboardStats {
  totalRaffles: number;
  activeRaffles: number;
  completedRaffles: number;
  totalUsers: number;
  totalRevenue: number;
  totalDistributed: number;
  totalTicketsSold: number;
  pendingPayments: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRaffles: 0,
    activeRaffles: 0,
    completedRaffles: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalDistributed: 0,
    totalTicketsSold: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Total de sorteios
      const { count: totalRaffles } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true });

      // Sorteios ativos
      const { count: activeRaffles } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Sorteios concluídos
      const { count: completedRaffles } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Total de usuários
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total distribuído (prêmios dos sorteios concluídos)
      const { data: completedRafflesData } = await supabase
        .from('raffles')
        .select('prize_value')
        .eq('status', 'completed');

      const totalDistributed = completedRafflesData?.reduce(
        (sum, raffle) => sum + Number(raffle.prize_value), 0
      ) || 0;

      // Total de bilhetes vendidos e receita
      const { data: ticketsData } = await supabase
        .from('raffle_tickets')
        .select('raffle_id, payment_status')
        .eq('payment_status', 'paid');

      const totalTicketsSold = ticketsData?.length || 0;

      // Calcular receita total (precisa buscar preço dos bilhetes)
      let totalRevenue = 0;
      if (ticketsData && ticketsData.length > 0) {
        const raffleIds = [...new Set(ticketsData.map(t => t.raffle_id))];
        const { data: rafflesData } = await supabase
          .from('raffles')
          .select('id, ticket_price')
          .in('id', raffleIds);

        const priceMap = Object.fromEntries(
          rafflesData?.map(r => [r.id, r.ticket_price]) || []
        );

        totalRevenue = ticketsData.reduce((sum, ticket) => {
          const price = priceMap[ticket.raffle_id] || 0;
          return sum + Number(price);
        }, 0);
      }

      // Pagamentos pendentes
      const { count: pendingPayments } = await supabase
        .from('raffle_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending');

      setStats({
        totalRaffles: totalRaffles || 0,
        activeRaffles: activeRaffles || 0,
        completedRaffles: completedRaffles || 0,
        totalUsers: totalUsers || 0,
        totalRevenue,
        totalDistributed,
        totalTicketsSold,
        pendingPayments: pendingPayments || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Sorteios</p>
              <p className="text-2xl font-bold">{stats.totalRaffles}</p>
            </div>
            <Trophy className="w-8 h-8 text-accent" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sorteios Ativos</p>
              <p className="text-2xl font-bold text-primary">{stats.activeRaffles}</p>
            </div>
            <Target className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Usuários Cadastrados</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bilhetes Vendidos</p>
              <p className="text-2xl font-bold">{stats.totalTicketsSold}</p>
            </div>
            <Ticket className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Distribuído</p>
              <p className="text-2xl font-bold text-accent">
                R$ {stats.totalDistributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-accent" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pagamentos Pendentes</p>
              <p className="text-2xl font-bold text-orange-500">{stats.pendingPayments}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receita Bruta:</span>
              <span className="font-semibold text-green-600">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prêmios Distribuídos:</span>
              <span className="font-semibold text-red-500">
                R$ {stats.totalDistributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Margem Bruta:</span>
              <span className="font-bold text-primary">
                R$ {(stats.totalRevenue - stats.totalDistributed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status dos Sorteios</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ativos:</span>
              <span className="font-semibold text-primary">{stats.activeRaffles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Concluídos:</span>
              <span className="font-semibold text-green-600">{stats.completedRaffles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de Conclusão:</span>
              <span className="font-semibold">
                {stats.totalRaffles > 0 
                  ? `${Math.round((stats.completedRaffles / stats.totalRaffles) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

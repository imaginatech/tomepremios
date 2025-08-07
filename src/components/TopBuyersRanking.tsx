import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface TopBuyer {
  user_id: string;
  full_name: string;
  total_tickets: number;
  position: number;
}

const TopBuyersRanking = () => {
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTopBuyers();
  }, []);

  const loadTopBuyers = async () => {
    try {
      console.log('Carregando ranking de top compradores...');
      
      // Buscar os usuários que mais compraram tickets no sorteio ativo
      const { data: activeRaffle } = await supabase
        .from('raffles')
        .select('id')
        .eq('status', 'active')
        .single();

      if (!activeRaffle) {
        console.log('Nenhum sorteio ativo encontrado');
        setIsLoading(false);
        return;
      }

      // Buscar ranking dos compradores com mais tickets
      const { data: buyers, error } = await supabase
        .from('raffle_tickets')
        .select(`
          user_id,
          profiles!inner(full_name)
        `)
        .eq('raffle_id', activeRaffle.id)
        .eq('payment_status', 'paid');

      if (error) {
        console.error('Erro ao buscar ranking:', error);
        setIsLoading(false);
        return;
      }

      // Agrupar e contar tickets por usuário
      const buyerCounts = buyers?.reduce((acc: any, ticket: any) => {
        const userId = ticket.user_id;
        const fullName = ticket.profiles?.full_name || 'Usuário';
        
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            full_name: fullName,
            total_tickets: 0
          };
        }
        acc[userId].total_tickets++;
        return acc;
      }, {});

      // Converter para array e ordenar
      const sortedBuyers = Object.values(buyerCounts || {})
        .sort((a: any, b: any) => b.total_tickets - a.total_tickets)
        .slice(0, 5) // Top 5
        .map((buyer: any, index: number) => ({
          ...buyer,
          position: index + 1
        }));

      console.log('Top compradores carregados:', sortedBuyers);
      setTopBuyers(sortedBuyers);
    } catch (error) {
      console.error('Erro ao carregar top compradores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-primary">{position}</span>;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-gradient-to-r from-primary/20 to-primary/40';
    }
  };

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Card className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                TOP COMPRADORES
              </h2>
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  if (topBuyers.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Card className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                TOP COMPRADORES
              </h2>
              <p className="text-muted-foreground">
                Seja o primeiro a participar e apareça no ranking!
              </p>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <Card className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              TOP COMPRADORES
            </h2>
            <p className="text-sm text-muted-foreground">
              Ranking dos participantes que mais compraram cotas
            </p>
          </div>

          <div className="space-y-3">
            {topBuyers.map((buyer) => (
              <div
                key={buyer.user_id}
                className={`
                  flex items-center justify-between p-4 rounded-lg
                  ${getPositionColor(buyer.position)} text-white
                  hover:scale-105 transition-transform duration-200
                  ${buyer.position <= 3 ? 'shine-effect' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  {getPositionIcon(buyer.position)}
                  <div>
                    <p className="font-semibold text-lg">
                      {buyer.full_name}
                    </p>
                    <p className="text-sm opacity-90">
                      {buyer.position}º lugar
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {buyer.total_tickets}
                  </p>
                  <p className="text-sm opacity-90">
                    {buyer.total_tickets === 1 ? 'cota' : 'cotas'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              🏆 Quanto mais cotas, maior sua chance de ganhar e melhor sua posição no ranking!
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default TopBuyersRanking;
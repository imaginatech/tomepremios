import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Award, AlertCircle, RefreshCw, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TopBuyer {
  user_id: string;
  full_name: string;
  total_tickets: number;
  rank: number;
}

const TopBuyersRanking = () => {
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopBuyers();
  }, []);

  const loadTopBuyers = async () => {
    setIsLoading(true);
    setError(null);
    
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
        setTopBuyers([]);
        setIsLoading(false);
        return;
      }

      // Buscar ranking dos compradores com mais tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('raffle_tickets')
        .select('user_id')
        .eq('raffle_id', activeRaffle.id)
        .eq('payment_status', 'paid');

      if (ticketsError) {
        console.error('Erro ao buscar tickets:', ticketsError);
        throw ticketsError;
      }

      if (!tickets || tickets.length === 0) {
        console.log('Nenhum ticket pago encontrado');
        setTopBuyers([]);
        setIsLoading(false);
        return;
      }

      // Agrupar tickets por usuário
      const buyerCounts = tickets.reduce((acc: any, ticket: any) => {
        const userId = ticket.user_id;
        if (!acc[userId]) {
          acc[userId] = 0;
        }
        acc[userId]++;
        return acc;
      }, {});

      // Buscar nomes dos usuários
      const userIds = Object.keys(buyerCounts);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
        throw profilesError;
      }

      // Criar array com dados completos dos compradores
      const buyersWithProfiles = userIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        return {
          user_id: userId,
          full_name: profile?.full_name || 'Usuário',
          total_tickets: buyerCounts[userId]
        };
      });

      // Ordenar e pegar apenas os top 3
      const sortedBuyers = buyersWithProfiles
        .sort((a, b) => b.total_tickets - a.total_tickets)
        .slice(0, 3)
        .map((buyer, index) => ({
          ...buyer,
          rank: index + 1
        }));

      console.log('Top 3 compradores carregados:', sortedBuyers);
      setTopBuyers(sortedBuyers);
    } catch (error: any) {
      console.error('Erro ao carregar top compradores:', error);
      setError(error.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Top 3 Compradores
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
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Top 3 Compradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4">
                  Erro ao carregar ranking: {error}
                </p>
                <Button onClick={loadTopBuyers} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Top 3 Compradores
            </CardTitle>
            <CardDescription>
              Ranking dos participantes que mais compraram cotas na edição ativa
              <br />
              <span className="text-primary font-medium">🏆 Quem comprar mais até sábado (09/08) ganha almoço no Restaurante Serrano!</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topBuyers.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma compra registrada ainda.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Seja o primeiro a comprar cotas e apareça no ranking!
                </p>
                <Button onClick={loadTopBuyers} variant="outline" size="sm" className="mt-4">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topBuyers.map((buyer) => (
                  <div
                    key={buyer.user_id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      buyer.rank === 1 
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 dark:from-yellow-950 dark:to-yellow-900 dark:border-yellow-800' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {getRankIcon(buyer.rank)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${buyer.rank === 1 ? 'text-black' : 'text-foreground'}`}>
                        {buyer.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {buyer.rank}º lugar
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Ticket className="w-4 h-4 text-muted-foreground" />
                        <span className={`font-bold text-lg ${buyer.rank === 1 ? 'text-black' : ''}`}>
                          {buyer.total_tickets}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        cota{buyer.total_tickets !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {buyer.rank === 1 && (
                      <div className="text-center">
                        <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black">
                          Líder
                        </Badge>
                        <p className="text-xs text-black font-medium mt-1">
                          Almoço grátis
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
                <li>• Compre cotas na edição atual para participar do ranking</li>
                <li>• Quanto mais cotas, melhor sua posição</li>
                <li>• O 1º lugar até sábado (09/08) ganha almoço no Restaurante Serrano</li>
                <li>• Prêmio será entregue no domingo (10/08)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TopBuyersRanking;
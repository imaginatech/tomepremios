import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, DollarSign, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Winner {
  id: number;
  name: string;
  number: string;
  prize: string;
  date: string;
  edition: string;
}

interface Stats {
  completedRaffles: number;
  totalDistributed: number;
  totalParticipants: number;
  totalUsers: number;
}

const Winners = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [stats, setStats] = useState<Stats>({
    completedRaffles: 0,
    totalDistributed: 0,
    totalParticipants: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWinnersAndStats();
  }, []);

  const fetchWinnersAndStats = async () => {
    try {
      // Buscar sorteios concluídos com ganhadores
      const { data: completedRaffles, error: rafflesError } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'completed')
        .not('winning_number', 'is', null)
        .order('draw_date', { ascending: false })
        .limit(3);

      if (rafflesError) {
        console.error('Error fetching completed raffles:', rafflesError);
      }

      // Buscar tickets dos ganhadores
      const winnersData: Winner[] = [];
      if (completedRaffles) {
        for (const raffle of completedRaffles) {
          // First get the winning ticket
          const { data: winningTicket, error: ticketError } = await supabase
            .from('raffle_tickets')
            .select('ticket_number, user_id')
            .eq('raffle_id', raffle.id)
            .eq('ticket_number', raffle.winning_number)
            .single();

          if (!ticketError && winningTicket) {
            // Then get the user profile
            const { data: userProfile, error: profileError } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', winningTicket.user_id)
              .single();

            if (!profileError && userProfile) {
              const winnerName = userProfile.full_name || 'Usuário';
              // Mascarar o nome (mostrar apenas primeira letra e último sobrenome)
              const nameParts = winnerName.split(' ');
              const maskedName = nameParts.length > 1 
                ? `${nameParts[0].charAt(0)}. ${nameParts[nameParts.length - 1].charAt(0)}.`
                : `${winnerName.charAt(0)}.`;

              winnersData.push({
                id: Math.random(),
                name: maskedName,
                number: String(raffle.winning_number).padStart(3, '0'),
                prize: `R$ ${raffle.prize_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                date: raffle.draw_date,
                edition: `#${String(completedRaffles.indexOf(raffle) + 1).padStart(3, '0')}`
              });
            }
          }
        }
      }

      setWinners(winnersData);

      // Buscar estatísticas
      // 1. Número de sorteios realizados (concluídos)
      const { count: completedCount } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // 2. Total distribuído (soma dos prêmios dos sorteios concluídos)
      const { data: totalPrizes } = await supabase
        .from('raffles')
        .select('prize_value')
        .eq('status', 'completed');

      const totalDistributed = totalPrizes?.reduce((sum, raffle) => sum + Number(raffle.prize_value), 0) || 0;

      // 3. Total de usuários cadastrados na plataforma
      const { count: totalUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        completedRaffles: completedCount || 0,
        totalDistributed,
        totalParticipants: totalUsersCount || 0, // Agora mostra total de usuários cadastrados
        totalUsers: totalUsersCount || 0
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 bg-muted/30" id="ganhadores">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-muted/30" id="ganhadores">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 golden-text">
            Últimos Ganhadores
          </h2>
          <p className="text-lg text-muted-foreground">
            Confira quem já foi contemplado nos nossos sorteios!
          </p>
        </div>

        {winners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {winners.map((winner, index) => (
              <Card key={winner.id} className="p-6 hover-lift bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="bg-accent text-white">
                    {winner.edition}
                  </Badge>
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="font-semibold">{winner.name}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 bg-primary rounded text-xs"></div>
                    <span>Número da Sorte: <strong>{winner.number}</strong></span>
                  </div>
                  
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-lg font-bold text-primary">{winner.prize}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(winner.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center mb-8">
            <p className="text-muted-foreground">Ainda não temos ganhadores registrados.</p>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-primary mb-1">{stats.completedRaffles}</div>
            <div className="text-sm text-muted-foreground">Sorteios Realizados</div>
          </Card>
          
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-accent mb-1">
              R$ {stats.totalDistributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">Total Distribuído</div>
          </Card>
          
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-primary mb-1">{stats.totalParticipants}</div>
            <div className="text-sm text-muted-foreground">Usuários Cadastrados</div>
          </Card>
          
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-accent mb-1">100%</div>
            <div className="text-sm text-muted-foreground">Taxa de Pagamento</div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Winners;

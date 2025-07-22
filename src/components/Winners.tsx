import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, DollarSign, User, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import StoryVideoModal from './StoryVideoModal';

interface Winner {
  id: string;
  name: string;
  number: string;
  prize: string;
  date: string;
  edition: string;
  videoUrl?: string;
  videoTitle?: string;
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
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{url: string; title: string} | null>(null);

  useEffect(() => {
    fetchWinnersAndStats();

    // Configurar realtime para atualizações de sorteios concluídos
    const channel = supabase
      .channel('winners-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raffles',
          filter: 'status=eq.completed'
        },
        (payload) => {
          console.log('Novo ganhador detectado:', payload);
          // Recarregar dados quando um sorteio for concluído
          fetchWinnersAndStats();
        }
      )
      .subscribe((status) => {
        console.log('Status da subscription Winners:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWinnersAndStats = async () => {
    try {
      console.log('Buscando ganhadores...');
      
      // Buscar sorteios concluídos com ganhadores
      const { data: completedRaffles, error: rafflesError } = await supabase
        .from('raffles')
        .select('*, winner_video_url, winner_video_title')
        .eq('status', 'completed')
        .not('winning_number', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(7);

      console.log('Sorteios concluídos encontrados:', completedRaffles);

      if (rafflesError) {
        console.error('Error fetching completed raffles:', rafflesError);
        return;
      }

      // Buscar dados dos ganhadores para cada sorteio
      const winnersData: Winner[] = [];
      if (completedRaffles && completedRaffles.length > 0) {
        for (let i = 0; i < completedRaffles.length; i++) {
          const raffle = completedRaffles[i];
          
          // Primeiro buscar o ticket ganhador
          const { data: winningTicket, error: ticketError } = await supabase
            .from('raffle_tickets')
            .select('ticket_number, user_id')
            .eq('raffle_id', raffle.id)
            .eq('ticket_number', raffle.winning_number)
            .eq('payment_status', 'paid')
            .single();

          console.log(`Ticket ganhador para raffle ${raffle.id}:`, winningTicket);

          if (!ticketError && winningTicket) {
            // Depois buscar o perfil do usuário
            const { data: userProfile, error: profileError } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', winningTicket.user_id)
              .single();

            console.log(`Perfil do ganhador para raffle ${raffle.id}:`, userProfile);

            if (!profileError && userProfile) {
              const winnerName = userProfile.full_name || 'Usuário';

              winnersData.push({
                id: raffle.id,
                name: winnerName,
                number: String(raffle.winning_number).padStart(3, '0'),
                prize: `R$ ${Number(raffle.prize_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                date: raffle.draw_date,
                edition: `#${String(i + 1).padStart(3, '0')}`,
                videoUrl: raffle.winner_video_url,
                videoTitle: raffle.winner_video_title || 'Mensagem do Ganhador'
              });
            } else {
              console.error(`Erro ao buscar perfil para raffle ${raffle.id}:`, profileError);
            }
          } else {
            console.error(`Erro ao buscar ticket para raffle ${raffle.id}:`, ticketError);
          }
        }
      }

      console.log('Dados dos ganhadores processados:', winnersData);
      setWinners(winnersData);

      // Buscar estatísticas em paralelo
      const [
        { count: completedCount },
        { data: totalPrizes },
        { count: totalUsersCount }
      ] = await Promise.all([
        supabase
          .from('raffles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),
        supabase
          .from('raffles')
          .select('prize_value')
          .eq('status', 'completed'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
      ]);

      const totalDistributed = totalPrizes?.reduce((sum, raffle) => sum + Number(raffle.prize_value), 0) || 0;

      console.log('Estatísticas:', { completedCount, totalDistributed, totalUsersCount });

      setStats({
        completedRaffles: completedCount || 0,
        totalDistributed,
        totalParticipants: totalUsersCount || 0,
        totalUsers: totalUsersCount || 0
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openVideoModal = (videoUrl: string, videoTitle: string) => {
    setSelectedVideo({ url: videoUrl, title: videoTitle });
    setVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setVideoModalOpen(false);
    setSelectedVideo(null);
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
                  
                  {/* Botão de mensagem do ganhador */}
                  {winner.videoUrl && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        onClick={() => openVideoModal(winner.videoUrl!, winner.videoTitle!)}
                        size="sm"
                        className="w-full flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Video className="w-4 h-4" />
                        Mensagem do Ganhador
                      </Button>
                    </div>
                  )}
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

      {/* Modal de vídeo */}
      {selectedVideo && (
        <StoryVideoModal
          isOpen={videoModalOpen}
          onClose={closeVideoModal}
          videoUrl={selectedVideo.url}
          title={selectedVideo.title}
        />
      )}
    </section>
  );
};

export default Winners;

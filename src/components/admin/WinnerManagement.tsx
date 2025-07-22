import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Video, Save, User, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Winner {
  id: string;
  title: string;
  prize_value: number;
  winning_number: number;
  draw_date: string;
  winner_name: string;
  winner_video_url: string | null;
  winner_video_title: string | null;
}

const WinnerManagement = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWinner, setEditingWinner] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('Mensagem do Ganhador');
  const { toast } = useToast();

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    try {
      setLoading(true);
      
      // Buscar sorteios concluídos
      const { data: raffles, error: rafflesError } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'completed')
        .not('winning_number', 'is', null)
        .order('draw_date', { ascending: false });

      if (rafflesError) throw rafflesError;

      const winnersData: Winner[] = [];
      
      for (const raffle of raffles || []) {
        // Buscar o ticket ganhador
        const { data: winningTicket } = await supabase
          .from('raffle_tickets')
          .select('user_id')
          .eq('raffle_id', raffle.id)
          .eq('ticket_number', raffle.winning_number)
          .eq('payment_status', 'paid')
          .single();

        if (winningTicket) {
          // Buscar o perfil do ganhador
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', winningTicket.user_id)
            .single();

          winnersData.push({
            id: raffle.id,
            title: raffle.title,
            prize_value: raffle.prize_value,
            winning_number: raffle.winning_number,
            draw_date: raffle.draw_date,
            winner_name: profile?.full_name || 'Usuário',
            winner_video_url: raffle.winner_video_url,
            winner_video_title: raffle.winner_video_title || 'Mensagem do Ganhador'
          });
        }
      }

      setWinners(winnersData);
    } catch (error) {
      console.error('Erro ao carregar ganhadores:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos ganhadores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (winner: Winner) => {
    setEditingWinner(winner.id);
    setVideoUrl(winner.winner_video_url || '');
    setVideoTitle(winner.winner_video_title || 'Mensagem do Ganhador');
  };

  const cancelEditing = () => {
    setEditingWinner(null);
    setVideoUrl('');
    setVideoTitle('Mensagem do Ganhador');
  };

  const saveVideo = async (winnerId: string) => {
    try {
      const { error } = await supabase
        .from('raffles')
        .update({
          winner_video_url: videoUrl || null,
          winner_video_title: videoTitle
        })
        .eq('id', winnerId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Vídeo do ganhador atualizado com sucesso"
      });

      setEditingWinner(null);
      setVideoUrl('');
      setVideoTitle('Mensagem do Ganhador');
      
      // Atualizar a lista local
      setWinners(prev => prev.map(winner => 
        winner.id === winnerId 
          ? { ...winner, winner_video_url: videoUrl || null, winner_video_title: videoTitle }
          : winner
      ));
    } catch (error) {
      console.error('Erro ao salvar vídeo:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar vídeo do ganhador",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold">Gerenciar Ganhadores</h2>
      </div>

      <div className="grid gap-6">
        {winners.map((winner) => (
          <Card key={winner.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  {winner.title}
                </span>
                {winner.winner_video_url && (
                  <Video className="w-5 h-5 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informações do ganhador */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{winner.winner_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded text-xs"></div>
                  <span>Número: <strong>{String(winner.winning_number).padStart(3, '0')}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary">
                    R$ {Number(winner.prize_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(winner.draw_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Seção de vídeo */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Vídeo do Ganhador
                </h4>

                {editingWinner === winner.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`url-${winner.id}`}>URL do Vídeo (HLS)</Label>
                        <Input
                          id={`url-${winner.id}`}
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://exemplo.com/video.m3u8"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`title-${winner.id}`}>Título do Vídeo</Label>
                        <Input
                          id={`title-${winner.id}`}
                          value={videoTitle}
                          onChange={(e) => setVideoTitle(e.target.value)}
                          placeholder="Mensagem do Ganhador"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveVideo(winner.id)} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={cancelEditing}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      {winner.winner_video_url ? (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Título: {winner.winner_video_title}
                          </p>
                          <p className="text-sm text-green-600 font-medium">
                            ✓ Vídeo configurado
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum vídeo configurado
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => startEditing(winner)}
                      className="flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      {winner.winner_video_url ? 'Editar Vídeo' : 'Adicionar Vídeo'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {winners.length === 0 && (
          <Card className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum ganhador encontrado</h3>
            <p className="text-muted-foreground">
              Aguarde os primeiros sorteios serem concluídos para gerenciar os ganhadores
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WinnerManagement;
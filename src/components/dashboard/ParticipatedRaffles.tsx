
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, X, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ParticipatedRaffle {
  id: string;
  title: string;
  prize_value: number;
  draw_date: string;
  winning_number: number | null;
  status: string;
  user_tickets: { ticket_number: number }[];
}

const ParticipatedRaffles = () => {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<ParticipatedRaffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchParticipatedRaffles();
    }
  }, [user]);

  const fetchParticipatedRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          *,
          raffle_tickets!inner(ticket_number, user_id)
        `)
        .eq('status', 'completed')
        .eq('raffle_tickets.user_id', user?.id)
        .order('draw_date', { ascending: false });

      if (error) {
        console.error('Error fetching participated raffles:', error);
        return;
      }

      const processedRaffles = (data || []).map(raffle => ({
        ...raffle,
        user_tickets: raffle.raffle_tickets || []
      }));

      setRaffles(processedRaffles);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isWinner = (raffle: ParticipatedRaffle) => {
    if (!raffle.winning_number) return false;
    return raffle.user_tickets.some(ticket => ticket.ticket_number === raffle.winning_number);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Edições que Participei
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
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
          <Award className="w-5 h-5" />
          Edições que Participei ({raffles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {raffles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Você ainda não participou de nenhuma edição finalizada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {raffles.map((raffle) => {
              const winner = isWinner(raffle);
              return (
                <div key={raffle.id} className={`border rounded-lg p-4 space-y-3 ${winner ? 'bg-green-50 border-green-200' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{raffle.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Sorteado em {format(new Date(raffle.draw_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {winner ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Trophy className="w-3 h-3 mr-1" />
                          Ganhador!
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          <X className="w-3 h-3 mr-1" />
                          Não Ganhou
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span>R$ {raffle.prize_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-blue-500" />
                      <span>Meus números: {raffle.user_tickets.map(t => t.ticket_number).join(', ')}</span>
                    </div>
                    
                    {raffle.winning_number && (
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-gold" />
                        <span>Número sorteado: {raffle.winning_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParticipatedRaffles;

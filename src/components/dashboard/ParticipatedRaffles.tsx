
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
  total_tickets: number;
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
      // Buscar tanto sorteios ativos quanto finalizados onde o usuário tem tickets
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          *,
          raffle_tickets!inner(ticket_number, user_id)
        `)
        .in('status', ['active', 'completed'])
        .eq('raffle_tickets.user_id', user?.id)
        .eq('raffle_tickets.payment_status', 'paid')
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
          Edições que Estou Participando ({raffles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {raffles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Você ainda não participou de nenhuma edição.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {raffles.map((raffle) => {
              const winner = isWinner(raffle);
              const isActive = raffle.status === 'active';
              const ticketNumbers = raffle.user_tickets.map(t => t.ticket_number.toString().padStart(3, '0'));
              
              return (
                <div key={raffle.id} className={`border rounded-lg p-4 space-y-3 ${winner ? 'border-green-500' : isActive ? 'border-blue-500' : 'border-border'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{raffle.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {isActive ? (
                          <>Concorra a R${raffle.prize_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} na sua conta hoje ainda!</>
                        ) : (
                          <>Sorteado em {format(new Date(raffle.draw_date), 'dd/MM/yyyy', { locale: ptBR })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          Ativo
                        </Badge>
                      ) : winner ? (
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-green-600" />
                      <span className="font-semibold">R$ {raffle.prize_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold">{raffle.user_tickets.length} número{raffle.user_tickets.length > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-orange-500" />
                      <span>{raffle.total_tickets} vagas</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-500" />
                      <span>{format(new Date(raffle.draw_date), 'dd/MM/yy', { locale: ptBR })}</span>
                    </div>
                  </div>

                  {/* Mostrar números comprados */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Meus números:</p>
                    <div className="flex flex-wrap gap-2">
                      {ticketNumbers.map((number, index) => (
                        <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                          {number}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {raffle.winning_number && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium">Número sorteado: </span>
                        <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded font-mono text-sm">
                          {raffle.winning_number.toString().padStart(3, '0')}
                        </span>
                      </div>
                    </div>
                  )}
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


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Users, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Raffle {
  id: string;
  title: string;
  description: string | null;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  draw_date: string;
  user_tickets: number;
}

const ActiveRaffles = () => {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActiveRaffles();
    }
  }, [user]);

  const fetchActiveRaffles = async () => {
    try {
      // Buscar sorteios ativos que o usuário está participando
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          *,
          raffle_tickets!inner(user_id)
        `)
        .eq('status', 'active')
        .eq('raffle_tickets.user_id', user?.id);

      if (error) {
        console.error('Error fetching active raffles:', error);
        return;
      }

      // Contar tickets por sorteio
      const rafflesWithTickets = await Promise.all(
        (data || []).map(async (raffle) => {
          const { count } = await supabase
            .from('raffle_tickets')
            .select('*', { count: 'exact' })
            .eq('raffle_id', raffle.id)
            .eq('user_id', user?.id);

          return {
            ...raffle,
            user_tickets: count || 0
          };
        })
      );

      setRaffles(rafflesWithTickets);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Edições que Estou Participando
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
          <Trophy className="w-5 h-5" />
          Edições que Estou Participando ({raffles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {raffles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Você ainda não está participando de nenhuma edição.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/#sorteios'}>
              Ver Sorteios Disponíveis
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {raffles.map((raffle) => (
              <div key={raffle.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{raffle.title}</h3>
                    <p className="text-sm text-muted-foreground">{raffle.description}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span>R$ {raffle.prize_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-blue-500" />
                    <span>{raffle.user_tickets} número{raffle.user_tickets !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span>{raffle.total_tickets} vagas</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500" />
                    <span>{format(new Date(raffle.draw_date), 'dd/MM/yy', { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveRaffles;

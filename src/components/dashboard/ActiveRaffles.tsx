import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Users, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Bet {
  id: string;
  numbers: number[];
  status: string;
  created_at: string;
  raffles: {
    id: string;
    title: string;
    draw_date: string;
    status: string;
  };
}

const ActiveRaffles = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchMyBets();
    }
  }, [user]);

  const fetchMyBets = async () => {
    try {
      // Buscar apostas do usuário com detalhes do sorteio
      const { data, error } = await supabase
        .from('raffle_bets')
        .select(`
          id,
          numbers,
          status,
          created_at,
          raffles (
            id,
            title,
            draw_date,
            status
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bets:', error);
        return;
      }

      // Tipagem manual para garantir que o TypeScript entenda a estrutura do join
      const formattedBets = (data as any[]).map(item => ({
        id: item.id,
        numbers: item.numbers,
        status: item.status || 'pending',
        created_at: item.created_at,
        raffles: item.raffles
      }));

      setBets(formattedBets);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, raffleStatus: string) => {
    if (raffleStatus === 'completed') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Finalizado</Badge>;
    }

    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Confirmado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Minhas Apostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 h-32 bg-muted/20"></div>
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
          <Ticket className="w-5 h-5" />
          Minhas Apostas ({bets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Você ainda não realizou nenhuma aposta.</p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Fazer uma fezinha
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bets.map((bet) => (
              <div key={bet.id} className="border rounded-lg p-4 space-y-3 hover:border-primary/30 transition-colors bg-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg">{bet.raffles?.title || 'Sorteio Indisponível'}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Sorteio: {bet.raffles?.draw_date ? format(new Date(bet.raffles.draw_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Data a definir'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                      Volante: #{bet.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(bet.status, bet.raffles?.status)}
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Seus números da sorte:</p>
                  <div className="flex flex-wrap gap-2">
                    {bet.numbers.map((num, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-primary/20 text-primary font-bold text-sm shadow-sm"
                      >
                        {String(num).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-right">
                  Aposta realizada em {format(new Date(bet.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
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

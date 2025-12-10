import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface RaffleResult {
  id: string;
  title: string;
  draw_date: string;
  drawn_numbers: number[];
  winners_count: {
    6: number;
    5: number;
    4: number;
  };
}

const Winners = () => {
  const [results, setResults] = useState<RaffleResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWinnersAndStats();

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
        () => {
          fetchWinnersAndStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWinnersAndStats = async () => {
    try {
      // 1. Fetch completed raffles
      const { data: completedRaffles, error: rafflesError } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'completed')
        .order('draw_date', { ascending: false })
        .limit(6);

      if (rafflesError) throw rafflesError;

      if (!completedRaffles || completedRaffles.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // 2. Fetch winners for these raffles to count matches
      const raffleIds = completedRaffles.map(r => r.id);
      const { data: winnersData, error: winnersError } = await supabase
        .from('raffle_winners')
        .select('raffle_id, matches')
        .in('raffle_id', raffleIds);

      if (winnersError) throw winnersError;

      // 3. Aggregate counts
      const processedResults: RaffleResult[] = completedRaffles.map(raffle => {
        const raffleWinners = winnersData?.filter(w => w.raffle_id === raffle.id) || [];

        return {
          id: raffle.id,
          title: raffle.title || `Sorteio #${raffle.id.slice(0, 4)}`,
          draw_date: raffle.draw_date,
          drawn_numbers: raffle.drawn_numbers || [],
          winners_count: {
            6: raffleWinners.filter(w => w.matches === 6).length,
            5: raffleWinners.filter(w => w.matches === 5).length,
            4: raffleWinners.filter(w => w.matches === 4).length
          }
        };
      });

      setResults(processedResults);

    } catch (error) {
      console.error('Error fetching winners data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 bg-muted/30" id="ganhadores">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando resultados...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-muted/30" id="ganhadores">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 golden-text">
            Resultados dos Sorteios
          </h2>
          <p className="text-lg text-muted-foreground">
            Confira os números sorteados e os ganhadores de cada edição
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {results.map((result) => (
              <Card key={result.id} className="overflow-hidden hover:shadow-lg transition-shadow border-primary/20">
                <div className="bg-primary/5 p-4 border-b border-primary/10 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-primary">{result.title}</h3>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(result.draw_date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10">
                    Concluído
                  </Badge>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 text-center">Números Sorteados</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {result.drawn_numbers.map((num, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold flex items-center justify-center shadow-sm">
                          {String(num).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-center p-2 border-b border-dashed border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium flex items-center">
                        <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                        Sena (6 acertos)
                      </span>
                      <span className="font-bold text-primary">{result.winners_count[6]} ganhadores</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border-b border-dashed border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium flex items-center">
                        <Trophy className="w-4 h-4 mr-2 text-gray-400" />
                        Quina (5 acertos)
                      </span>
                      <span className="font-bold text-primary">{result.winners_count[5]} ganhadores</span>
                    </div>
                    <div className="flex justify-between items-center p-2">
                      <span className="text-sm font-medium flex items-center">
                        <Trophy className="w-4 h-4 mr-2 text-amber-600" />
                        Quadra (4 acertos)
                      </span>
                      <span className="font-bold text-primary">{result.winners_count[4]} ganhadores</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center mb-12 py-12 bg-card rounded-lg border border-dashed">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum sorteio foi realizado ainda.</p>
            <p className="text-sm text-muted-foreground/80">Fique atento, o próximo sorteio pode ser o seu!</p>
          </div>
        )}

      </div>
    </section>
  );
};

export default Winners;

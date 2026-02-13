
import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface CompletedPoll {
  id: string;
  title: string;
  options: { label: string }[];
  winning_option: number | null;
  prize_amount: number;
  category: string | null;
  updated_at: string;
}

const PalpitecoWinners = () => {
  const [completedPolls, setCompletedPolls] = useState<CompletedPoll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedPolls();
  }, []);

  const fetchCompletedPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      const parsed = (data || []).map((p: any) => ({
        ...p,
        options: (typeof p.options === 'string' ? JSON.parse(p.options) : p.options) as { label: string }[],
      }));
      setCompletedPolls(parsed);
    } catch (e) {
      console.error('Erro ao buscar resultados:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 bg-muted/30" id="resultados-palpiteco">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando resultados...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-muted/30" id="resultados-palpiteco">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 golden-text">
            Resultados do Palpiteco
          </h2>
          <p className="text-lg text-muted-foreground">
            Confira as enquetes finalizadas e as respostas certas
          </p>
        </div>

        {completedPolls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {completedPolls.map((poll) => (
              <Card key={poll.id} className="overflow-hidden hover:shadow-lg transition-shadow border-primary/20">
                <div className="bg-primary/5 p-4 border-b border-primary/10 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-primary">{poll.title}</h3>
                    {poll.category && (
                      <Badge variant="outline" className="mt-1 text-xs">{poll.category}</Badge>
                    )}
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Finalizada</Badge>
                </div>
                <div className="p-6">
                  <div className="space-y-2 mb-4">
                    {poll.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-3 rounded-lg border ${
                          poll.winning_option === i
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        {poll.winning_option === i && (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                        <span className={`text-sm ${poll.winning_option === i ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                          {opt.label}
                        </span>
                        {poll.winning_option === i && (
                          <Badge className="ml-auto bg-primary text-primary-foreground text-xs">Certa!</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-center bg-muted/50 rounded-lg p-3">
                    <span className="text-sm text-muted-foreground">Prêmio: </span>
                    <span className="font-bold text-accent">R$ {poll.prize_amount.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center mb-12 py-12 bg-card rounded-lg border border-dashed">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma enquete finalizada ainda.</p>
            <p className="text-sm text-muted-foreground/80">Participe das enquetes ativas e fique ligado!</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PalpitecoWinners;

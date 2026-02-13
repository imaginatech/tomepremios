import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface PollOption {
  label: string;
}

interface PollEntry {
  id: string;
  selected_option: number;
  created_at: string;
  poll_id: string;
  polls: {
    id: string;
    title: string;
    question: string | null;
    options: PollOption[];
    status: string;
    winning_option: number | null;
    prize_amount: number;
    category: string | null;
  };
}

const MyPolls = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('poll_entries')
        .select(`
          id,
          selected_option,
          created_at,
          poll_id,
          polls (
            id,
            title,
            question,
            options,
            status,
            winning_option,
            prize_amount,
            category
          )
        `)
        .eq('user_id', user?.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching poll entries:', error);
        return;
      }

      const formatted = (data as any[]).map(item => ({
        ...item,
        polls: {
          ...item.polls,
          options: typeof item.polls.options === 'string'
            ? JSON.parse(item.polls.options)
            : item.polls.options,
        },
      }));

      setEntries(formatted);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResult = (entry: PollEntry) => {
    const poll = entry.polls;
    if (poll.status !== 'completed' || poll.winning_option === null) return null;
    return entry.selected_option === poll.winning_option;
  };

  const getStatusBadge = (poll: PollEntry['polls']) => {
    switch (poll.status) {
      case 'active':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Em andamento</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Encerrada</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Finalizada</Badge>;
      default:
        return <Badge variant="outline">{poll.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Meus Palpites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="border rounded-lg p-4 h-28 bg-muted/20" />
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
          <HelpCircle className="w-5 h-5" />
          Meus Palpites ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Você ainda não participou de nenhuma enquete.</p>
            <Button className="mt-4" onClick={() => navigate('/palpiteco')}>
              Participar do Palpitaco
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => {
              const poll = entry.polls;
              const result = getResult(entry);
              const selectedLabel = poll.options[entry.selected_option]?.label || '—';

              return (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3 hover:border-primary/30 transition-colors bg-card">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{poll.title}</h3>
                      {poll.question && (
                        <p className="text-sm text-muted-foreground">{poll.question}</p>
                      )}
                      {poll.category && (
                        <Badge variant="outline" className="mt-1 text-xs">{poll.category}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(poll)}
                    </div>
                  </div>

                  <div className="bg-muted/30 p-3 rounded-md space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Seu palpite:</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm">
                        {selectedLabel}
                      </span>
                    </div>

                    {poll.status === 'completed' && poll.winning_option !== null && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Resposta certa:</p>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {poll.options[poll.winning_option]?.label || '—'}
                        </span>

                        <div className="mt-2">
                          {result ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Você acertou! 🎉
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Não foi dessa vez
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          Prêmio: <span className="font-bold text-accent">R$ {poll.prize_amount.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground text-right">
                    Palpite em {format(new Date(entry.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
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

export default MyPolls;

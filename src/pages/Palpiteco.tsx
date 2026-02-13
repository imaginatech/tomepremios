
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PollCard from '@/components/palpiteco/PollCard';
import PalpitecoPaymentModal from '@/components/palpiteco/PalpitecoPaymentModal';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, Loader2 } from 'lucide-react';

interface PollOption {
  label: string;
}

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  winning_option: number | null;
  prize_amount: number;
  entry_price: number;
  status: string;
  category: string | null;
}

interface PollEntry {
  poll_id: string;
  selected_option: number;
}

const Palpiteco = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [entries, setEntries] = useState<PollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    pollId: string;
    pollTitle: string;
    selectedOption: number;
    optionLabel: string;
    entryPrice: number;
  } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const categories = ['Todos', 'Esportes', 'Famosos', 'Entretenimento', 'Outros'];

  useEffect(() => {
    loadPolls();
  }, []);

  useEffect(() => {
    if (user) loadEntries();
  }, [user]);

  const loadPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .in('status', ['active', 'closed', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map((p: any) => ({
        ...p,
        options: (typeof p.options === 'string' ? JSON.parse(p.options) : p.options) as PollOption[],
      }));
      setPolls(parsed);
    } catch (e) {
      console.error('Erro ao carregar enquetes:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('poll_entries')
        .select('poll_id, selected_option')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid');
      setEntries(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleParticipate = (pollId: string, selectedOption: number) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    setPaymentModal({
      isOpen: true,
      pollId,
      pollTitle: poll.title,
      selectedOption,
      optionLabel: poll.options[selectedOption]?.label || '',
      entryPrice: poll.entry_price,
    });
  };

  const filteredPolls = activeCategory === 'Todos'
    ? polls
    : polls.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-full mb-4">
            <HelpCircle className="w-5 h-5" />
            <span className="font-bold">PALPITECO</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Dê seu Palpite e Ganhe!</h1>
          <p className="text-muted-foreground">Escolha a opção certa e leve o prêmio pra casa</p>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 justify-center flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma enquete disponível nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolls.map(poll => {
              const entry = entries.find(e => e.poll_id === poll.id);
              return (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onParticipate={handleParticipate}
                  hasParticipated={!!entry}
                  userSelection={entry?.selected_option}
                />
              );
            })}
          </div>
        )}
      </main>
      <Footer />

      {paymentModal && (
        <PalpitecoPaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() => { setPaymentModal(null); }}
          onSuccess={() => { setPaymentModal(null); loadEntries(); loadPolls(); }}
          pollId={paymentModal.pollId}
          pollTitle={paymentModal.pollTitle}
          selectedOption={paymentModal.selectedOption}
          optionLabel={paymentModal.optionLabel}
          entryPrice={paymentModal.entryPrice}
        />
      )}

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
    </div>
  );
};

export default Palpiteco;

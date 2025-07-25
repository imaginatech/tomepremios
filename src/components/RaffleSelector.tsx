
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import PixPaymentModal from './PixPaymentModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const RaffleSelector = () => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRaffleId, setActiveRaffleId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Carregar dados do sorteio ativo e configurar realtime
  useEffect(() => {
    loadRaffleAndSoldNumbers();
  }, []);

  // Configurar realtime quando temos um sorteio ativo
  useEffect(() => {
    if (!activeRaffleId) return;

    const channel = supabase
      .channel('raffle-selector-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffle_tickets',
          filter: `raffle_id=eq.${activeRaffleId}`
        },
        (payload) => {
          console.log('Atualização de tickets detectada no RaffleSelector:', payload);
          loadSoldNumbers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRaffleId]);

  const loadRaffleAndSoldNumbers = async () => {
    try {
      console.log('Iniciando carregamento do RaffleSelector...');
      setIsLoading(true);
      
      // Buscar sorteio ativo
      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .select('id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Resultado sorteio ativo RaffleSelector:', { raffle, raffleError });

      if (raffleError) {
        console.error('Erro ao buscar sorteio ativo:', raffleError);
        setIsLoading(false);
        return;
      }

      if (!raffle) {
        console.log('Nenhum sorteio ativo encontrado no RaffleSelector');
        setIsLoading(false);
        return;
      }

      console.log('Sorteio ativo encontrado, carregando números vendidos...');
      setActiveRaffleId(raffle.id);
      await loadSoldNumbers(raffle.id);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados do RaffleSelector:', error);
      setIsLoading(false);
    }
  };

  const loadSoldNumbers = async (raffleId?: string) => {
    try {
      const targetRaffleId = raffleId || activeRaffleId;
      console.log('loadSoldNumbers chamado com:', { raffleId, activeRaffleId, targetRaffleId });
      
      if (!targetRaffleId) {
        console.log('Nenhum raffleId fornecido, interrompendo...');
        return;
      }

      console.log('Buscando números vendidos para raffle:', targetRaffleId);

      // Buscar números já vendidos do sorteio ativo específico
      const { data, error } = await supabase
        .from('raffle_tickets')
        .select('ticket_number')
        .eq('raffle_id', targetRaffleId)
        .eq('payment_status', 'paid');

      console.log('Resultado busca números vendidos:', { data, error });

      if (error) {
        console.error('Erro ao carregar números vendidos:', error);
        return;
      }

      const sold = data?.map(ticket => ticket.ticket_number) || [];
      console.log('Números vendidos encontrados:', sold);
      setSoldNumbers(sold);
    } catch (error) {
      console.error('Erro ao carregar números vendidos:', error);
    } finally {
      if (!raffleId) {
        console.log('Finalizando loading...');
        setIsLoading(false);
      }
    }
  };

  // Gerar números de 1 a 200
  const allNumbers = Array.from({ length: 200 }, (_, i) => i + 1);

  const toggleNumber = (number: number) => {
    if (soldNumbers.includes(number)) return;
    
    setSelectedNumbers(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
  };

  const clearSelection = () => {
    setSelectedNumbers([]);
  };

  const handlePayment = () => {
    if (selectedNumbers.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um número para continuar",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Abrir modal do PIX
    setShowPixModal(true);
  };

  const handleAuthSuccess = () => {
    // Usuário fez login/cadastro com sucesso, continuar para pagamento
    setShowAuthModal(false);
    setShowPixModal(true);
  };

  const handlePixSuccess = () => {
    // Recarregar números vendidos após pagamento bem-sucedido
    loadSoldNumbers();
    
    // Limpar seleção após pagamento bem-sucedido
    setSelectedNumbers([]);
    setShowPixModal(false);
    
    toast({
      title: "Parabéns! 🎉",
      description: "Você está participando do sorteio! Boa sorte!",
    });
  };

  const total = selectedNumbers.length * 5;

  return (
    <>
      <section className="py-12" id="sorteios">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 golden-text">
              Escolha Seus Números da Sorte
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Selecione quantos números quiser • R$ 5,00 cada título
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Seletor de Números */}
            <div className="lg:col-span-3">
              <Card className="p-6 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Números Disponíveis</h3>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-primary rounded mr-2"></div>
                        <span>Disponível</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-accent rounded mr-2"></div>
                        <span>Selecionado</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-muted rounded mr-2"></div>
                        <span>Vendido</span>
                      </div>
                    </div>
                  </div>
                  {selectedNumbers.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-muted-foreground">Carregando números...</span>
                  </div>
                ) : (
                  <div className="titles-grid">
                    {allNumbers.map(number => {
                      const isSelected = selectedNumbers.includes(number);
                      const isSold = soldNumbers.includes(number);
                      
                      return (
                        <button
                          key={number}
                          onClick={() => toggleNumber(number)}
                          className={`title-number ${
                            isSold ? 'sold' : isSelected ? 'selected' : 'available'
                          }`}
                          disabled={isSold}
                        >
                          {String(number).padStart(3, '0')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Carrinho de Compras */}
            <div className="lg:col-span-1">
              <Card className="p-6 bg-card/50 backdrop-blur-sm sticky top-24">
                <div className="flex items-center mb-4">
                  <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
                  <h3 className="text-lg font-semibold">Seus Números</h3>
                </div>

                {selectedNumbers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum número selecionado</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 max-h-48 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {selectedNumbers.sort((a, b) => a - b).map(number => (
                          <Badge key={number} variant="secondary" className="bg-accent text-white">
                            {String(number).padStart(3, '0')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span>Quantidade:</span>
                        <span className="font-semibold">{selectedNumbers.length} título{selectedNumbers.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <span>Valor por título:</span>
                        <span className="font-semibold">R$ 5,00</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span className="text-primary">R$ {total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full btn-pix text-white" 
                      size="lg"
                      onClick={handlePayment}
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      {user ? 'Pagar com PIX' : 'Login e Pagar com PIX'}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-3">
                      {user ? 'Pagamento processado instantaneamente' : 'Faça login para continuar'}
                    </p>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        onSuccess={handlePixSuccess}
        selectedNumbers={selectedNumbers}
        total={total}
      />
    </>
  );
};

export default RaffleSelector;

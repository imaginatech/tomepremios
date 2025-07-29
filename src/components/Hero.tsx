
import React, { useState, useEffect } from 'react';
import { Trophy, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const Hero = () => {
  const [raffleData, setRaffleData] = useState({
    title: 'EDIÇÃO #001',
    prizeValue: 500.00,
    ticketPrice: 5.00,
    totalTickets: 200,
    soldTickets: 0,
    isLoading: true
  });

  const [activeRaffleId, setActiveRaffleId] = useState<string | null>(null);

  useEffect(() => {
    loadRaffleData();
  }, []);

  useEffect(() => {
    if (!activeRaffleId) return;

    console.log('Configurando realtime para raffle:', activeRaffleId);

    // Configurar realtime para atualizações de tickets
    const channel = supabase
      .channel(`hero-raffle-${activeRaffleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffle_tickets',
          filter: `raffle_id=eq.${activeRaffleId}`
        },
        (payload) => {
          console.log('Atualização de ticket detectada no Hero:', payload);
          // Recarregar apenas os dados dos tickets para otimizar
          loadTicketsCount();
        }
      )
      .subscribe((status) => {
        console.log('Status da subscription realtime Hero:', status);
      });

    return () => {
      console.log('Removendo subscription realtime Hero');
      supabase.removeChannel(channel);
    };
  }, [activeRaffleId]);

  const loadRaffleData = async () => {
    try {
      console.log('Iniciando carregamento de dados do sorteio...');
      
      // Buscar sorteio ativo
      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Resultado da consulta:', { raffle, raffleError });

      if (raffleError) {
        console.error('Erro ao buscar sorteio:', raffleError);
        setRaffleData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (!raffle) {
        console.log('Nenhum sorteio ativo encontrado');
        setRaffleData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      console.log('Sorteio encontrado:', raffle);

      // Buscar números vendidos
      const { data: tickets, error: ticketsError } = await supabase
        .from('raffle_tickets')
        .select('ticket_number')
        .eq('raffle_id', raffle.id)
        .eq('payment_status', 'paid');

      if (ticketsError) {
        console.error('Erro ao buscar tickets:', ticketsError);
        return;
      }

      const soldCount = tickets?.length || 0;
      console.log(`Tickets vendidos: ${soldCount}/${raffle.total_tickets}`);

      setActiveRaffleId(raffle.id);
      
      setRaffleData({
        title: raffle.title,
        prizeValue: raffle.prize_value,
        ticketPrice: raffle.ticket_price,
        totalTickets: raffle.total_tickets,
        soldTickets: soldCount,
        isLoading: false
      });
    } catch (error) {
      console.error('Erro ao carregar dados do sorteio:', error);
      setRaffleData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const loadTicketsCount = async () => {
    if (!activeRaffleId) return;

    try {
      console.log('Atualizando contagem de tickets em tempo real...');
      
      // Buscar apenas números vendidos para otimizar
      const { data: tickets, error: ticketsError } = await supabase
        .from('raffle_tickets')
        .select('ticket_number')
        .eq('raffle_id', activeRaffleId)
        .eq('payment_status', 'paid');

      if (ticketsError) {
        console.error('Erro ao buscar tickets para atualização:', ticketsError);
        return;
      }

      const soldCount = tickets?.length || 0;
      console.log(`Atualização realtime - Tickets vendidos: ${soldCount}/${raffleData.totalTickets}`);

      // Atualizar apenas o soldTickets mantendo os outros dados
      setRaffleData(prev => ({
        ...prev,
        soldTickets: soldCount
      }));
    } catch (error) {
      console.error('Erro ao atualizar contagem de tickets:', error);
    }
  };

  const availableTickets = raffleData.totalTickets - raffleData.soldTickets;
  const soldPercentage = raffleData.totalTickets > 0 
    ? Math.round((raffleData.soldTickets / raffleData.totalTickets) * 100)
    : 0;

  return (
    <section className="relative py-12 md:py-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-dark opacity-50"></div>
      <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Banner de Prêmios Instantâneos */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white p-4 border-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 animate-pulse"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="text-2xl animate-bounce">⭐</span>
                <div>
                  <h2 className="text-lg md:text-xl font-bold mb-1">
                    NOVIDADE: PRÊMIOS INSTANTÂNEOS!
                  </h2>
                  <p className="text-sm md:text-base opacity-95">
                    Fez sua fezinha em um número premiado? <strong>Leva PIX na hora!</strong>
                  </p>
                </div>
                <span className="text-2xl animate-bounce delay-200">💸</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Banner Principal */}
        <Card className="p-6 md:p-8 mb-8 gradient-gold text-white shine-effect hover-lift">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/20 rounded-full px-4 py-2 mb-4">
              <Trophy className="w-5 h-5 mr-2" />
              <span className="font-semibold">SORTEIO ATIVO</span>
            </div>
            
            {raffleData.isLoading ? (
              <div className="animate-pulse">
                <div className="h-12 bg-white/20 rounded mb-4"></div>
                <div className="h-8 bg-white/20 rounded mb-6"></div>
                <div className="h-24 bg-white/20 rounded mb-6"></div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl md:text-5xl font-bold mb-4">
                  {raffleData.title}
                </h1>
                <p className="text-xl md:text-2xl mb-6 font-semibold">
                  CONCORRA A R$ {raffleData.prizeValue.toFixed(2).replace('.', ',')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold">{raffleData.totalTickets}</div>
                    <div className="text-sm opacity-90">Títulos Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold">R$ {raffleData.ticketPrice.toFixed(0)}</div>
                    <div className="text-sm opacity-90">Por Título</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold">{availableTickets}</div>
                    <div className="text-sm opacity-90">Disponíveis</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold">{soldPercentage}%</div>
                    <div className="text-sm opacity-90">Vendidos</div>
                  </div>
                </div>
              </>
            )}
            
            <Button 
              size="lg" 
              className="btn-pix text-lg px-8 py-4 hover-lift"
              onClick={() => {
                const sectionElement = document.getElementById('sorteios');
                if (sectionElement) {
                  sectionElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <DollarSign className="w-5 h-5 mr-2" />
              PARTICIPAR AGORA
            </Button>
          </div>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-lg md:text-xl text-muted-foreground mb-4">
            Pagamento 100% seguro via PIX
          </p>
          <p className="text-sm text-muted-foreground">
            Seus números são reservados instantaneamente após o pagamento
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;

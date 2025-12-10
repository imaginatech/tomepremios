
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
    bannerUrl: null as string | null,
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

      // Buscar configurações da loteria para o banner
      const { data: settings } = await supabase
        .from('lottery_settings')
        .select('banner_url')
        .single();

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

      const activeRaffle = raffle;
      let soldCount = 0;

      if (activeRaffle) {
        // Buscar números vendidos apenas se houver sorteio
        const { data: tickets, error: ticketsError } = await supabase
          .from('raffle_tickets')
          .select('ticket_number')
          .eq('raffle_id', activeRaffle.id)
          .eq('payment_status', 'paid');

        if (!ticketsError) {
          soldCount = tickets?.length || 0;
        }
        setActiveRaffleId(activeRaffle.id);
      }

      setRaffleData({
        title: activeRaffle?.title || 'Sorteio',
        prizeValue: activeRaffle?.prize_value || 0,
        ticketPrice: activeRaffle?.ticket_price || 0,
        totalTickets: activeRaffle?.total_tickets || 0,
        soldTickets: soldCount,
        bannerUrl: settings?.banner_url || null,
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
                  <h2 className="text-lg md:text-xl font-bold mb-1 whitespace-nowrap">
                    HOJE É O SEU DIA DE SORTE!
                  </h2>
                  <p className="text-sm md:text-base opacity-95">
                    Faça sua fezinha na loteria da Tome prêmios e passe o Natal tranquilo!
                  </p>
                </div>
                <span className="text-2xl animate-bounce delay-200">💸</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Banner Principal */}
        <div className="mb-8 text-center relative">
          {raffleData.isLoading ? (
            <div className="animate-pulse h-64 bg-white/10 rounded-xl mb-6"></div>
          ) : raffleData.bannerUrl ? (
            <div className="rounded-xl overflow-hidden shadow-2xl mb-8 transform hover:scale-[1.01] transition-transform duration-300">
              <img
                src={raffleData.bannerUrl}
                alt="Banner do Sorteio"
                className="w-full h-auto object-cover max-h-[500px]"
              />
            </div>
          ) : (
            /* Fallback se não tiver imagem: Banner antigo simplificado */
            <Card className="p-6 md:p-8 mb-8 gradient-gold text-white shine-effect hover-lift">
              <div className="text-center">
                <div className="inline-flex items-center bg-white/20 rounded-full px-4 py-2 mb-4">
                  <Trophy className="w-5 h-5 mr-2" />
                  <span className="font-semibold">SORTEIO ATIVO</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-4">{raffleData.title}</h1>
                <p className="text-xl md:text-2xl mb-6 font-semibold">
                  CONCORRA A R$ {raffleData.prizeValue.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </Card>
          )}

          <Button
            size="lg"
            className="btn-pix text-lg px-12 py-6 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-pulse"
            onClick={() => {
              const sectionElement = document.getElementById('sorteios');
              if (sectionElement) {
                sectionElement.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <DollarSign className="w-6 h-6 mr-2" />
            QUERO PARTICIPAR AGORA
          </Button>
        </div>

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

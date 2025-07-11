import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  schema: string;
  old_record: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    console.log('Payload recebido:', payload);

    // Processar apenas quando um ticket é pago
    if (payload.table === 'raffle_tickets' && 
        payload.type === 'INSERT' && 
        payload.record.payment_status === 'paid') {
      
      const ticket = payload.record;
      console.log('Processando ticket pago:', ticket);

      // Verificar se o usuário foi indicado por alguém
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('referred_by')
        .eq('id', ticket.user_id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        return new Response(JSON.stringify({ error: 'Erro ao buscar perfil' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Perfil encontrado:', profile);

      // Se foi indicado, processar a recompensa
      if (profile?.referred_by) {
        console.log('Usuário foi indicado pelo código:', profile.referred_by);

        // Buscar o afiliado
        const { data: affiliate, error: affiliateError } = await supabaseClient
          .from('affiliates')
          .select('id, user_id')
          .eq('affiliate_code', profile.referred_by)
          .eq('status', 'active')
          .single();

        if (affiliateError) {
          console.error('Erro ao buscar afiliado:', affiliateError);
          return new Response(JSON.stringify({ error: 'Afiliado não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Afiliado encontrado:', affiliate);

        // Verificar se já existe registro de indicação
        const { data: existingReferral, error: referralCheckError } = await supabaseClient
          .from('affiliate_referrals')
          .select('id, status')
          .eq('affiliate_id', affiliate.id)
          .eq('referred_user_id', ticket.user_id)
          .single();

        if (referralCheckError && referralCheckError.code !== 'PGRST116') {
          console.error('Erro ao verificar indicação existente:', referralCheckError);
          return new Response(JSON.stringify({ error: 'Erro ao verificar indicação' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Indicação existente:', existingReferral);

        // Se já existe e está como 'registered', atualizar para 'participant'
        if (existingReferral && existingReferral.status === 'registered') {
          const { error: updateError } = await supabaseClient
            .from('affiliate_referrals')
            .update({ 
              status: 'participant',
              raffle_id: ticket.raffle_id
            })
            .eq('id', existingReferral.id);

          if (updateError) {
            console.error('Erro ao atualizar indicação:', updateError);
            return new Response(JSON.stringify({ error: 'Erro ao atualizar indicação' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log('Indicação atualizada para participant');

          // Buscar próximo sorteio ativo ou criar um novo
          const { data: nextRaffle, error: nextRaffleError } = await supabaseClient
            .from('raffles')
            .select('id, total_tickets')
            .eq('status', 'active')
            .neq('id', ticket.raffle_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (nextRaffleError) {
            console.error('Erro ao buscar próximo sorteio:', nextRaffleError);
            return new Response(JSON.stringify({ error: 'Erro ao buscar próximo sorteio' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          let targetRaffleId = null;
          
          if (nextRaffle && nextRaffle.length > 0) {
            targetRaffleId = nextRaffle[0].id;
          } else {
            // Se não há próximo sorteio ativo, buscar o mais recente que ainda pode receber números bônus
            const { data: futureRaffle } = await supabaseClient
              .from('raffles')
              .select('id')
              .gt('draw_date', new Date().toISOString())
              .order('draw_date', { ascending: true })
              .limit(1);

            if (futureRaffle && futureRaffle.length > 0) {
              targetRaffleId = futureRaffle[0].id;
            }
          }

          if (targetRaffleId) {
            // Buscar números disponíveis no sorteio alvo
            const { data: takenNumbers, error: takenError } = await supabaseClient
              .from('raffle_tickets')
              .select('ticket_number')
              .eq('raffle_id', targetRaffleId);

            if (takenError) {
              console.error('Erro ao buscar números ocupados:', takenError);
              return new Response(JSON.stringify({ error: 'Erro ao buscar números ocupados' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            const takenNumbersSet = new Set(takenNumbers?.map(t => t.ticket_number) || []);
            const availableNumbers = [];
            
            // Gerar números disponíveis (assumindo 200 números por sorteio)
            for (let i = 1; i <= 200; i++) {
              if (!takenNumbersSet.has(i)) {
                availableNumbers.push(i);
              }
            }

            if (availableNumbers.length > 0) {
              // Escolher um número aleatório
              const randomIndex = Math.floor(Math.random() * availableNumbers.length);
              const bonusNumber = availableNumbers[randomIndex];

              console.log('Número bônus gerado:', bonusNumber);

              // Salvar número bônus
              const { error: bonusError } = await supabaseClient
                .from('affiliate_bonus_numbers')
                .insert({
                  affiliate_id: affiliate.id,
                  raffle_id: targetRaffleId,
                  bonus_numbers: [bonusNumber]
                });

              if (bonusError) {
                console.error('Erro ao salvar número bônus:', bonusError);
                return new Response(JSON.stringify({ error: 'Erro ao salvar número bônus' }), {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              // Reservar o número no sorteio
              const { error: reserveError } = await supabaseClient
                .from('raffle_tickets')
                .insert({
                  user_id: affiliate.user_id,
                  raffle_id: targetRaffleId,
                  ticket_number: bonusNumber,
                  payment_status: 'bonus'
                });

              if (reserveError) {
                console.error('Erro ao reservar número bônus:', reserveError);
                return new Response(JSON.stringify({ error: 'Erro ao reservar número bônus' }), {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              console.log('Número bônus reservado com sucesso');

              return new Response(JSON.stringify({ 
                success: true, 
                message: 'Recompensa processada com sucesso',
                bonusNumber: bonusNumber
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            } else {
              console.log('Nenhum número disponível no próximo sorteio');
              return new Response(JSON.stringify({ 
                success: true, 
                message: 'Indicação atualizada, mas nenhum número disponível'
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            console.log('Nenhum sorteio futuro encontrado para números bônus');
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Indicação atualizada, aguardando próximo sorteio'
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.log('Indicação não encontrada ou já processada');
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Nenhuma ação necessária'
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        console.log('Usuário não foi indicado por ninguém');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Usuário não foi indicado'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
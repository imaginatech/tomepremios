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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('=== INÍCIO PROCESSAMENTO BÔNUS AFILIADO ===');
    
    const body = await req.json() as WebhookPayload;
    console.log('Webhook payload recebido:', JSON.stringify(body, null, 2));

    // Verificar se é um ticket sendo pago (INSERT ou UPDATE)
    if (body.table !== 'raffle_tickets' || body.record?.payment_status !== 'paid') {
      console.log('Evento não é um ticket pago, ignorando');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Evento não processado - não é um ticket pago',
          details: {
            type: body.type,
            table: body.table,
            payment_status: body.record?.payment_status
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Para UPDATEs, verificar se o status mudou para 'paid'
    if (body.type === 'UPDATE') {
      const oldStatus = body.old_record?.payment_status;
      const newStatus = body.record?.payment_status;
      
      if (oldStatus === 'paid' || newStatus !== 'paid') {
        console.log('UPDATE não é uma mudança para status paid, ignorando');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'UPDATE não é mudança para paid',
            details: { oldStatus, newStatus }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    const ticketData = body.record;
    console.log('Dados do ticket:', JSON.stringify(ticketData, null, 2));

    // Buscar o perfil do usuário que comprou o ticket
    console.log(`Buscando perfil do usuário: ${ticketData.user_id}`);
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', ticketData.user_id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil do usuário:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar perfil do usuário',
          details: profileError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Perfil do usuário encontrado:', JSON.stringify(userProfile, null, 2));

    // Verificar se o usuário foi indicado
    if (!userProfile?.referred_by) {
      console.log('Usuário não foi indicado por afiliado, não há bônus a processar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuário não foi indicado - sem bônus a processar' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar informações do afiliado
    console.log(`Buscando afiliado com código: ${userProfile.referred_by}`);
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id, affiliate_code, status')
      .eq('affiliate_code', userProfile.referred_by)
      .eq('status', 'active')
      .single();

    if (affiliateError || !affiliate) {
      console.error('Erro ao buscar afiliado:', affiliateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Afiliado não encontrado ou inativo',
          details: { 
            affiliate_code: userProfile.referred_by,
            error: affiliateError 
          }
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Afiliado encontrado:', JSON.stringify(affiliate, null, 2));

    // Verificar se já existe uma indicação para este usuário
    console.log(`Verificando indicação existente para usuário: ${ticketData.user_id}`);
    const { data: existingReferral, error: referralCheckError } = await supabase
      .from('affiliate_referrals')
      .select('id, status, raffle_id')
      .eq('affiliate_id', affiliate.id)
      .eq('referred_user_id', ticketData.user_id)
      .single();

    if (referralCheckError && referralCheckError.code !== 'PGRST116') {
      console.error('Erro ao verificar indicação existente:', referralCheckError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao verificar indicação',
          details: referralCheckError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Indicação existente encontrada:', JSON.stringify(existingReferral, null, 2));

    // Se já existe indicação e ela já foi processada para este sorteio, ignorar
    if (existingReferral && existingReferral.status === 'completed' && existingReferral.raffle_id === ticketData.raffle_id) {
      console.log('Indicação já processada para este sorteio, ignorando');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Bônus já processado para este sorteio' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Atualizar ou criar indicação
    if (existingReferral) {
      console.log('Atualizando indicação existente');
      const { error: updateError } = await supabase
        .from('affiliate_referrals')
        .update({
          status: 'completed',
          raffle_id: ticketData.raffle_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingReferral.id);

      if (updateError) {
        console.error('Erro ao atualizar indicação:', updateError);
        throw updateError;
      }
    } else {
      console.log('Criando nova indicação');
      const { error: insertError } = await supabase
        .from('affiliate_referrals')
        .insert({
          affiliate_id: affiliate.id,
          referred_user_id: ticketData.user_id,
          raffle_id: ticketData.raffle_id,
          status: 'completed'
        });

      if (insertError) {
        console.error('Erro ao criar indicação:', insertError);
        throw insertError;
      }
    }

    console.log('Indicação processada com sucesso');

    // Buscar sorteio ativo para gerar número bônus
    console.log('Buscando sorteio ativo');
    const { data: activeRaffleId, error: raffleError } = await supabase
      .rpc('get_active_raffle');

    if (raffleError || !activeRaffleId) {
      console.error('Erro ao buscar sorteio ativo:', raffleError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum sorteio ativo encontrado',
          details: raffleError 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Sorteio ativo encontrado:', activeRaffleId);

    // Buscar números já reservados no sorteio ativo
    console.log('Buscando números já reservados');
    const { data: reservedTickets, error: ticketsError } = await supabase
      .from('raffle_tickets')
      .select('ticket_number')
      .eq('raffle_id', activeRaffleId)
      .eq('payment_status', 'paid');

    if (ticketsError) {
      console.error('Erro ao buscar números reservados:', ticketsError);
      throw ticketsError;
    }

    // Buscar números bônus já atribuídos para este afiliado neste sorteio
    const { data: existingBonusNumbers, error: bonusError } = await supabase
      .from('affiliate_bonus_numbers')
      .select('bonus_numbers')
      .eq('affiliate_id', affiliate.id)
      .eq('raffle_id', activeRaffleId)
      .single();

    if (bonusError && bonusError.code !== 'PGRST116') {
      console.error('Erro ao buscar números bônus existentes:', bonusError);
      throw bonusError;
    }

    const reservedNumbers = new Set([
      ...reservedTickets.map(t => t.ticket_number),
      ...(existingBonusNumbers?.bonus_numbers || [])
    ]);

    console.log('Números já reservados:', Array.from(reservedNumbers));

    // Gerar número bônus disponível (1-200)
    let bonusNumber: number | null = null;
    for (let i = 1; i <= 200; i++) {
      if (!reservedNumbers.has(i)) {
        bonusNumber = i;
        break;
      }
    }

    if (!bonusNumber) {
      console.log('Todos os números estão ocupados');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Todos os números do sorteio estão ocupados' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Número bônus gerado:', bonusNumber);

    // Salvar número bônus
    if (existingBonusNumbers) {
      // Atualizar números bônus existentes
      const updatedBonusNumbers = [...existingBonusNumbers.bonus_numbers, bonusNumber];
      const { error: updateBonusError } = await supabase
        .from('affiliate_bonus_numbers')
        .update({
          bonus_numbers: updatedBonusNumbers
        })
        .eq('affiliate_id', affiliate.id)
        .eq('raffle_id', activeRaffleId);

      if (updateBonusError) {
        console.error('Erro ao atualizar números bônus:', updateBonusError);
        throw updateBonusError;
      }
    } else {
      // Criar novo registro de números bônus
      const { error: insertBonusError } = await supabase
        .from('affiliate_bonus_numbers')
        .insert({
          affiliate_id: affiliate.id,
          raffle_id: activeRaffleId,
          bonus_numbers: [bonusNumber]
        });

      if (insertBonusError) {
        console.error('Erro ao inserir números bônus:', insertBonusError);
        throw insertBonusError;
      }
    }

    // Reservar o número no sorteio
    console.log('Reservando número bônus no sorteio');
    const { error: reserveError } = await supabase
      .from('raffle_tickets')
      .insert({
        user_id: affiliate.user_id,
        raffle_id: activeRaffleId,
        ticket_number: bonusNumber,
        payment_status: 'paid'
      });

    if (reserveError) {
      console.error('Erro ao reservar número bônus:', reserveError);
      throw reserveError;
    }

    console.log('=== BÔNUS PROCESSADO COM SUCESSO ===');
    console.log(`Afiliado: ${affiliate.affiliate_code}`);
    console.log(`Número bônus: ${bonusNumber}`);
    console.log(`Sorteio: ${activeRaffleId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bônus de afiliado processado com sucesso',
        data: {
          affiliate_code: affiliate.affiliate_code,
          bonus_number: bonusNumber,
          raffle_id: activeRaffleId,
          referred_user_id: ticketData.user_id
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERRO NO PROCESSAMENTO ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
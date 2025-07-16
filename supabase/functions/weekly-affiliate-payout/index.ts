import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log('=== INÍCIO PROCESSAMENTO GANHADOR SEMANAL ===');
    
    // Calcular semana anterior (segunda a domingo)
    const now = new Date();
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setDate(now.getDate() - now.getDay()); // Último domingo
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Segunda-feira anterior
    lastWeekStart.setHours(0, 0, 0, 0);

    console.log(`Processando semana: ${lastWeekStart.toISOString().split('T')[0]} a ${lastWeekEnd.toISOString().split('T')[0]}`);

    // Verificar se já foi processado para esta semana
    const { data: existingWinner, error: existingError } = await supabase
      .from('weekly_affiliate_winners')
      .select('id')
      .eq('week_start', lastWeekStart.toISOString().split('T')[0])
      .eq('week_end', lastWeekEnd.toISOString().split('T')[0])
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Erro ao verificar ganhador existente:', existingError);
      throw existingError;
    }

    if (existingWinner) {
      console.log('Ganhador já processado para esta semana');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Ganhador já processado para esta semana',
          week_start: lastWeekStart.toISOString().split('T')[0],
          week_end: lastWeekEnd.toISOString().split('T')[0]
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar indicações válidas da semana anterior
    const { data: weeklyReferrals, error: referralsError } = await supabase
      .from('affiliate_referrals')
      .select(`
        affiliate_id,
        created_at,
        affiliates!inner (
          id,
          affiliate_code,
          user_id,
          profiles (
            full_name,
            pix_key
          )
        )
      `)
      .eq('status', 'participant')
      .gte('week_start', lastWeekStart.toISOString().split('T')[0])
      .lte('week_start', lastWeekEnd.toISOString().split('T')[0])
      .order('created_at', { ascending: true }); // Primeiro que fez indicação ganha em caso de empate

    if (referralsError) {
      console.error('Erro ao buscar indicações da semana:', referralsError);
      throw referralsError;
    }

    console.log(`Encontradas ${weeklyReferrals?.length || 0} indicações válidas na semana`);

    if (!weeklyReferrals || weeklyReferrals.length === 0) {
      console.log('Nenhuma indicação válida encontrada para a semana');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma indicação válida encontrada para a semana',
          week_start: lastWeekStart.toISOString().split('T')[0],
          week_end: lastWeekEnd.toISOString().split('T')[0]
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Agrupar e contar indicações por afiliado
    const affiliateStats: { [key: string]: { count: number; affiliate: any; firstReferral: string } } = {};

    weeklyReferrals.forEach((referral: any) => {
      const affiliateId = referral.affiliate_id;
      
      if (!affiliateStats[affiliateId]) {
        affiliateStats[affiliateId] = {
          count: 0,
          affiliate: referral.affiliates,
          firstReferral: referral.created_at
        };
      }
      
      affiliateStats[affiliateId].count++;
      
      // Manter o primeiro referral para critério de desempate
      if (new Date(referral.created_at) < new Date(affiliateStats[affiliateId].firstReferral)) {
        affiliateStats[affiliateId].firstReferral = referral.created_at;
      }
    });

    // Encontrar o afiliado com mais indicações (critério de desempate: primeiro a fazer indicação)
    const sortedAffiliates = Object.entries(affiliateStats)
      .sort(([,a], [,b]) => {
        if (b.count !== a.count) {
          return b.count - a.count; // Mais indicações primeiro
        }
        return new Date(a.firstReferral).getTime() - new Date(b.firstReferral).getTime(); // Primeiro referral ganha
      });

    const [winnerAffiliateId, winnerStats] = sortedAffiliates[0];
    const winner = winnerStats.affiliate;

    console.log('=== GANHADOR IDENTIFICADO ===');
    console.log(`Afiliado: ${winner.affiliate_code}`);
    console.log(`Nome: ${winner.profiles?.full_name || 'Não informado'}`);
    console.log(`Indicações: ${winnerStats.count}`);
    console.log(`Primeiro referral: ${winnerStats.firstReferral}`);

    // Registrar o ganhador
    const { data: newWinner, error: insertError } = await supabase
      .from('weekly_affiliate_winners')
      .insert({
        affiliate_id: winner.id,
        week_start: lastWeekStart.toISOString().split('T')[0],
        week_end: lastWeekEnd.toISOString().split('T')[0],
        referrals_count: winnerStats.count,
        prize_amount: 500.00
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao registrar ganhador:', insertError);
      throw insertError;
    }

    console.log('=== GANHADOR REGISTRADO COM SUCESSO ===');
    
    // Log para administração manual do pagamento
    console.log('=== INFORMAÇÕES PARA PAGAMENTO MANUAL ===');
    console.log(`ID do Ganhador: ${newWinner.id}`);
    console.log(`Afiliado: ${winner.affiliate_code}`);
    console.log(`Nome: ${winner.profiles?.full_name || 'Não informado'}`);
    console.log(`PIX: ${winner.profiles?.pix_key || 'Não informado'}`);
    console.log(`Valor: R$ 500,00`);
    console.log(`Semana: ${lastWeekStart.toISOString().split('T')[0]} a ${lastWeekEnd.toISOString().split('T')[0]}`);
    console.log(`Indicações válidas: ${winnerStats.count}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ganhador semanal processado com sucesso',
        data: {
          winner_id: newWinner.id,
          affiliate_code: winner.affiliate_code,
          affiliate_name: winner.profiles?.full_name,
          pix_key: winner.profiles?.pix_key,
          referrals_count: winnerStats.count,
          prize_amount: 500.00,
          week_start: lastWeekStart.toISOString().split('T')[0],
          week_end: lastWeekEnd.toISOString().split('T')[0]
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
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
    console.log('=== INÍCIO PROCESSAMENTO GANHADOR MENSAL ===');
    
    // Calcular mês anterior
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthYear = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`Processando mês: ${monthYear}`);

    // Verificar se já foi processado para este mês
    const { data: existingWinner, error: existingError } = await supabase
      .from('monthly_affiliate_winners')
      .select('id')
      .eq('month_year', monthYear)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Erro ao verificar ganhador existente:', existingError);
      throw existingError;
    }

    if (existingWinner) {
      console.log('Ganhador já processado para este mês');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Ganhador já processado para este mês',
          month_year: monthYear
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar indicações válidas do mês anterior
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

    const { data: monthlyReferrals, error: referralsError } = await supabase
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
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())
      .order('created_at', { ascending: true });

    if (referralsError) {
      console.error('Erro ao buscar indicações do mês:', referralsError);
      throw referralsError;
    }

    console.log(`Encontradas ${monthlyReferrals?.length || 0} indicações válidas no mês`);

    if (!monthlyReferrals || monthlyReferrals.length === 0) {
      console.log('Nenhuma indicação válida encontrada para o mês');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma indicação válida encontrada para o mês',
          month_year: monthYear
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Agrupar e contar indicações por afiliado
    const affiliateStats: { [key: string]: { count: number; affiliate: any; firstReferral: string } } = {};

    monthlyReferrals.forEach((referral: any) => {
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

    console.log('=== GANHADOR MENSAL IDENTIFICADO ===');
    console.log(`Afiliado: ${winner.affiliate_code}`);
    console.log(`Nome: ${winner.profiles?.full_name || 'Não informado'}`);
    console.log(`Indicações: ${winnerStats.count}`);
    console.log(`Primeiro referral: ${winnerStats.firstReferral}`);

    // Registrar o ganhador mensal
    const { data: newWinner, error: insertError } = await supabase
      .from('monthly_affiliate_winners')
      .insert({
        affiliate_id: winner.id,
        month_year: monthYear,
        referrals_count: winnerStats.count,
        prize_amount: 1320.00 // 1 salário mínimo
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao registrar ganhador mensal:', insertError);
      throw insertError;
    }

    console.log('=== GANHADOR MENSAL REGISTRADO COM SUCESSO ===');
    
    // Log para administração manual do pagamento
    console.log('=== INFORMAÇÕES PARA PAGAMENTO MANUAL ===');
    console.log(`ID do Ganhador: ${newWinner.id}`);
    console.log(`Afiliado: ${winner.affiliate_code}`);
    console.log(`Nome: ${winner.profiles?.full_name || 'Não informado'}`);
    console.log(`PIX: ${winner.profiles?.pix_key || 'Não informado'}`);
    console.log(`Valor: R$ 1.320,00 (1 salário)`);
    console.log(`Mês: ${monthYear}`);
    console.log(`Indicações válidas: ${winnerStats.count}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ganhador mensal processado com sucesso',
        data: {
          winner_id: newWinner.id,
          affiliate_code: winner.affiliate_code,
          affiliate_name: winner.profiles?.full_name,
          pix_key: winner.profiles?.pix_key,
          referrals_count: winnerStats.count,
          prize_amount: 1320.00,
          month_year: monthYear
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERRO NO PROCESSAMENTO MENSAL ===');
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
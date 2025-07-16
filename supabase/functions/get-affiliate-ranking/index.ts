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
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  try {
    console.log('=== BUSCAR RANKING SEMANAL ===');
    
    // Calcular semana atual (domingo a sábado)
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    console.log(`Semana atual: ${currentWeekStart.toISOString().split('T')[0]} a ${currentWeekEnd.toISOString().split('T')[0]}`);

    // Buscar indicações válidas da semana atual
    const { data: weeklyReferrals, error } = await supabase
      .from('affiliate_referrals')
      .select(`
        affiliate_id,
        created_at,
        affiliates!inner (
          affiliate_code,
          user_id,
          profiles (
            full_name
          )
        )
      `)
      .eq('status', 'participant')
      .gte('week_start', currentWeekStart.toISOString().split('T')[0])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar indicações:', error);
      throw error;
    }

    console.log(`Encontradas ${weeklyReferrals?.length || 0} indicações válidas na semana`);

    // Agrupar e contar indicações por afiliado
    const affiliateStats: { [key: string]: any } = {};

    weeklyReferrals?.forEach((referral: any) => {
      const affiliateId = referral.affiliate_id;
      const affiliateCode = referral.affiliates.affiliate_code;
      const userName = referral.affiliates.profiles?.full_name;

      if (!affiliateStats[affiliateId]) {
        affiliateStats[affiliateId] = {
          affiliate_id: affiliateId,
          affiliate_code: affiliateCode,
          referrals_count: 0,
          user_name: userName,
          first_referral: referral.created_at,
          rank: 0
        };
      }
      
      affiliateStats[affiliateId].referrals_count++;
      
      // Manter o primeiro referral para critério de desempate
      if (new Date(referral.created_at) < new Date(affiliateStats[affiliateId].first_referral)) {
        affiliateStats[affiliateId].first_referral = referral.created_at;
      }
    });

    // Converter para array e ordenar
    const sortedRankings = Object.values(affiliateStats)
      .sort((a: any, b: any) => {
        if (b.referrals_count !== a.referrals_count) {
          return b.referrals_count - a.referrals_count; // Mais indicações primeiro
        }
        return new Date(a.first_referral).getTime() - new Date(b.first_referral).getTime(); // Primeiro referral ganha
      })
      .slice(0, 10) // Top 10
      .map((item: any, index) => ({
        ...item,
        rank: index + 1
      }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rankings: sortedRankings,
          week_start: currentWeekStart.toISOString().split('T')[0],
          week_end: currentWeekEnd.toISOString().split('T')[0],
          total_affiliates: sortedRankings.length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERRO NO RANKING ===');
    console.error('Erro:', error);
    
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
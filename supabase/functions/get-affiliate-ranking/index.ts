
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
    console.log('=== BUSCAR RANKING SEMANAL - SIMPLIFICADO ===');
    
    // Buscar dos últimos 7 dias para simplificar
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();
    const nowStr = now.toISOString();

    console.log(`Buscando referrals participant desde: ${sevenDaysAgoStr}`);
    console.log(`Até: ${nowStr}`);

    // Buscar por status 'participant' usando apenas created_at
    const { data: weeklyReferrals, error } = await supabase
      .from('affiliate_referrals')
      .select('affiliate_id, created_at')
      .eq('status', 'participant')
      .gte('created_at', sevenDaysAgoStr)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar indicações:', error);
      throw error;
    }

    console.log(`Query executada com filtros:`);
    console.log(`- Status: participant`);
    console.log(`- Created_at >= '${sevenDaysAgoStr}'`);
    console.log(`Indicações encontradas:`, weeklyReferrals);
    console.log(`Total de indicações: ${weeklyReferrals?.length || 0}`);

    // Se não há dados, retornar vazio
    if (!weeklyReferrals || weeklyReferrals.length === 0) {
      console.log('Nenhuma indicação participant encontrada - retornando lista vazia');
      
      // Vamos fazer uma consulta adicional para debug
      const { data: allReferrals } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('DEBUG - Últimas 10 indicações na base:', allReferrals);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            rankings: [],
            week_start: sevenDaysAgo.toISOString().split('T')[0],
            week_end: now.toISOString().split('T')[0],
            total_affiliates: 0,
            debug: {
              query_filters: {
                status: 'participant',
                created_at_filter: `created_at >= '${sevenDaysAgoStr}'`
              },
              all_referrals_sample: allReferrals?.slice(0, 3) || []
            }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar dados dos afiliados
    const affiliateIds = [...new Set(weeklyReferrals.map((r: any) => r.affiliate_id))];
    console.log('IDs dos afiliados encontrados:', affiliateIds);

    const { data: affiliatesData, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('id, affiliate_code, user_id')
      .in('id', affiliateIds);

    if (affiliatesError) {
      console.error('Erro ao buscar dados dos afiliados:', affiliatesError);
      throw affiliatesError;
    }

    // Buscar dados dos profiles dos afiliados
    const userIds = affiliatesData?.map((a: any) => a.user_id) || [];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Erro ao buscar profiles:', profilesError);
      throw profilesError;
    }

    console.log('Dados dos afiliados:', affiliatesData);
    console.log('Dados dos profiles:', profilesData);

    // Agrupar e contar indicações por afiliado
    const affiliateStats: { [key: string]: any } = {};

    weeklyReferrals.forEach((referral: any) => {
      const affiliateId = referral.affiliate_id;
      const affiliateInfo = affiliatesData?.find((a: any) => a.id === affiliateId);
      
      if (!affiliateInfo) {
        console.warn(`Afiliado não encontrado para ID: ${affiliateId}`);
        return;
      }

      const profileInfo = profilesData?.find((p: any) => p.id === affiliateInfo.user_id);
      const affiliateCode = affiliateInfo.affiliate_code;
      const userName = profileInfo?.full_name;

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

    console.log('Estatísticas dos afiliados:', affiliateStats);

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

    console.log('Rankings finais:', sortedRankings);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rankings: sortedRankings,
          week_start: sevenDaysAgo.toISOString().split('T')[0],
          week_end: now.toISOString().split('T')[0],
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

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
    
    // Calcular semana atual (segunda a domingo - ISO 8601)
    const now = new Date();
    const currentWeekStart = new Date(now);
    
    // Ajustar para segunda-feira como início da semana
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Se domingo, voltar 6 dias, senão (dia - 1)
    currentWeekStart.setDate(now.getDate() - daysFromMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = currentWeekStart.toISOString().split('T')[0];
    const weekEndStr = currentWeekEnd.toISOString().split('T')[0];

    console.log(`Semana atual: ${weekStartStr} a ${weekEndStr}`);

    // Buscar indicações válidas da semana atual
    const { data: weeklyReferrals, error } = await supabase
      .from('affiliate_referrals')
      .select('affiliate_id, created_at')
      .eq('status', 'participant')
      .gte('week_start', weekStartStr)
      .lte('week_start', weekEndStr)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar indicações:', error);
      throw error;
    }

    console.log(`Query executada: week_start >= '${weekStartStr}' AND week_start <= '${weekEndStr}'`);
    console.log(`Indicações encontradas:`, weeklyReferrals);
    console.log(`Encontradas ${weeklyReferrals?.length || 0} indicações válidas na semana`);

    // Se não há dados, retornar vazio
    if (!weeklyReferrals || weeklyReferrals.length === 0) {
      console.log('Nenhuma indicação encontrada - retornando lista vazia');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            rankings: [],
            week_start: currentWeekStart.toISOString().split('T')[0],
            week_end: currentWeekEnd.toISOString().split('T')[0],
            total_affiliates: 0
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
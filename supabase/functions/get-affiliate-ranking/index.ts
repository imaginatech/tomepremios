
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
    console.log('=== BUSCAR TOP 10 AFILIADOS - QUERY DIRETA ===');
    
    // Usar exatamente a query que funciona manualmente
    const { data: rankingData, error: rankingError } = await supabase
      .from('affiliate_referrals')
      .select(`
        affiliate_id,
        affiliates!inner (
          affiliate_code,
          user_id,
          profiles!inner (
            full_name
          )
        )
      `)
      .eq('status', 'participant');

    if (rankingError) {
      console.error('Erro na query principal:', rankingError);
      throw rankingError;
    }

    console.log('Dados brutos da query:', rankingData);
    console.log(`Total de registros encontrados: ${rankingData?.length || 0}`);

    if (!rankingData || rankingData.length === 0) {
      console.log('Nenhuma indicação participant encontrada');
      
      // Debug - buscar todas as indicações para diagnosticar
      const { data: debugData } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .limit(10);
      
      console.log('DEBUG - Todas as indicações:', debugData);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            rankings: [],
            total_affiliates: 0,
            debug: {
              message: 'Nenhuma indicação participant encontrada',
              all_referrals: debugData || []
            }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Agrupar por afiliado e contar indicações
    const affiliateStats: { [key: string]: any } = {};
    
    rankingData.forEach((record: any) => {
      const affiliateId = record.affiliate_id;
      const affiliate = record.affiliates;
      
      if (!affiliate) {
        console.warn(`Afiliado não encontrado para ID: ${affiliateId}`);
        return;
      }

      const profile = affiliate.profiles;
      if (!profile) {
        console.warn(`Profile não encontrado para afiliado: ${affiliateId}`);
        return;
      }

      if (!affiliateStats[affiliateId]) {
        affiliateStats[affiliateId] = {
          affiliate_id: affiliateId,
          affiliate_code: affiliate.affiliate_code,
          user_name: profile.full_name,
          referrals_count: 0,
          rank: 0
        };
      }
      
      affiliateStats[affiliateId].referrals_count++;
    });

    console.log('Estatísticas processadas:', affiliateStats);

    // Converter para array e ordenar por quantidade de indicações
    const sortedRankings = Object.values(affiliateStats)
      .sort((a: any, b: any) => b.referrals_count - a.referrals_count)
      .slice(0, 10) // Top 10
      .map((item: any, index) => ({
        ...item,
        rank: index + 1
      }));

    console.log('Rankings finais ordenados:', sortedRankings);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rankings: sortedRankings,
          total_affiliates: sortedRankings.length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERRO CRÍTICO NO RANKING ===');
    console.error('Erro completo:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

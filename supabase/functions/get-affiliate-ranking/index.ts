
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
    console.log('=== BUSCAR TOP 10 AFILIADOS COM SERVICE ROLE ===');
    
    // Usar query SQL direta que sabemos que funciona
    const { data: rankingData, error: rankingError } = await supabase
      .rpc('get_affiliate_rankings');

    if (rankingError) {
      console.error('Erro na RPC function:', rankingError);
      
      // Fallback: tentar query manual com ordenação correta
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('affiliate_referrals')
        .select(`
          affiliate_id,
          created_at,
          affiliates!inner (
            affiliate_code,
            profiles!inner (
              full_name
            )
          )
        `)
        .eq('status', 'participant');

      if (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
        throw fallbackError;
      }

      console.log('Usando fallback, dados:', fallbackData);
      
       // Processar dados do fallback com ordenação correta
       const affiliateStats: { [key: string]: any } = {};
       
       (fallbackData || []).forEach((record: any) => {
         const affiliateId = record.affiliate_id;
         const affiliate = record.affiliates;
         
         if (affiliate && affiliate.profiles) {
           if (!affiliateStats[affiliateId]) {
             affiliateStats[affiliateId] = {
               affiliate_id: affiliateId,
               affiliate_code: affiliate.affiliate_code,
               user_name: affiliate.profiles.full_name,
               referrals_count: 0,
               first_referral_date: record.created_at
             };
           }
           affiliateStats[affiliateId].referrals_count++;
           
           // Manter a data da primeira indicação
           if (new Date(record.created_at) < new Date(affiliateStats[affiliateId].first_referral_date)) {
             affiliateStats[affiliateId].first_referral_date = record.created_at;
           }
         }
       });

       const sortedRankings = Object.values(affiliateStats)
         .sort((a: any, b: any) => {
           // Primeiro por número de indicações (descendente)
           if (b.referrals_count !== a.referrals_count) {
             return b.referrals_count - a.referrals_count;
           }
           // Em caso de empate, por primeira indicação (ascendente - quem fez primeiro)
           return new Date(a.first_referral_date).getTime() - new Date(b.first_referral_date).getTime();
         })
         .slice(0, 10)
         .map((item: any, index) => ({
           ...item,
           rank: index + 1
         }));

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            rankings: sortedRankings,
            total_affiliates: sortedRankings.length,
            source: 'fallback'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Dados da RPC:', rankingData);

    // Processar dados da RPC
    const processedRankings = (rankingData || []).map((item: any, index: number) => ({
      affiliate_id: item.affiliate_id,
      affiliate_code: item.affiliate_code,
      user_name: item.full_name,
      referrals_count: item.referrals_count,
      rank: index + 1
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rankings: processedRankings,
          total_affiliates: processedRankings.length,
          source: 'rpc'
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

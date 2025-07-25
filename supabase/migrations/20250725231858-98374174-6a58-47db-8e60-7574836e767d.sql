-- Resetar ranking de afiliados para nova semana
-- Atualizar a função get_affiliate_rankings para considerar apenas a semana atual

CREATE OR REPLACE FUNCTION public.get_affiliate_rankings()
 RETURNS TABLE(affiliate_id uuid, affiliate_code text, full_name text, referrals_count bigint, first_referral_date timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT 
    ar.affiliate_id,
    a.affiliate_code,
    p.full_name,
    COUNT(DISTINCT ar.referred_user_id) as referrals_count,
    MIN(ar.created_at) as first_referral_date
  FROM affiliate_referrals ar
  JOIN affiliates a ON a.id = ar.affiliate_id
  JOIN profiles p ON p.id = a.user_id
  WHERE ar.status = 'participant'
    AND ar.week_start = date_trunc('week', CURRENT_DATE)::date  -- Apenas semana atual
  GROUP BY ar.affiliate_id, a.affiliate_code, p.full_name
  ORDER BY referrals_count DESC, first_referral_date ASC
  LIMIT 10;
$function$;

-- Atualizar todos os affiliate_referrals existentes para definir week_start se for NULL
-- Isso garante que os dados antigos tenham uma semana definida
UPDATE affiliate_referrals 
SET week_start = date_trunc('week', created_at)::date
WHERE week_start IS NULL;
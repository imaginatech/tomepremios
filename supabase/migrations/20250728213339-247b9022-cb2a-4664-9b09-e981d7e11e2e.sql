-- Atualizar função para ranking mensal em vez de semanal
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
    AND date_trunc('month', ar.created_at) = date_trunc('month', CURRENT_DATE)  -- Apenas mês atual
  GROUP BY ar.affiliate_id, a.affiliate_code, p.full_name
  ORDER BY referrals_count DESC, first_referral_date ASC
  LIMIT 10;
$function$
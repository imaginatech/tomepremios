-- Atualizar função para contabilizar apenas indicações a partir de hoje
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
    AND ar.created_at >= '2025-07-28 00:00:00+00'::timestamp with time zone  -- Apenas a partir de hoje
  GROUP BY ar.affiliate_id, a.affiliate_code, p.full_name
  ORDER BY referrals_count DESC, first_referral_date ASC
  LIMIT 10;
$function$
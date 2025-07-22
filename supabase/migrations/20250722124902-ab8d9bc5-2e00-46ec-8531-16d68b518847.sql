-- Criar função RPC para buscar ranking de afiliados
CREATE OR REPLACE FUNCTION get_affiliate_rankings()
RETURNS TABLE(
  affiliate_id UUID,
  affiliate_code TEXT,
  full_name TEXT,
  referrals_count BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    ar.affiliate_id,
    a.affiliate_code,
    p.full_name,
    COUNT(*) as referrals_count
  FROM affiliate_referrals ar
  JOIN affiliates a ON a.id = ar.affiliate_id
  JOIN profiles p ON p.id = a.user_id
  WHERE ar.status = 'participant'
  GROUP BY ar.affiliate_id, a.affiliate_code, p.full_name
  ORDER BY referrals_count DESC
  LIMIT 10;
$$;
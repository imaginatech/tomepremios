-- Remover função existente e recriar com ordenação correta para empates
DROP FUNCTION IF EXISTS get_affiliate_rankings();

CREATE OR REPLACE FUNCTION get_affiliate_rankings()
RETURNS TABLE(
  affiliate_id UUID,
  affiliate_code TEXT,
  full_name TEXT,
  referrals_count BIGINT,
  first_referral_date TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    ar.affiliate_id,
    a.affiliate_code,
    p.full_name,
    COUNT(*) as referrals_count,
    MIN(ar.created_at) as first_referral_date
  FROM affiliate_referrals ar
  JOIN affiliates a ON a.id = ar.affiliate_id
  JOIN profiles p ON p.id = a.user_id
  WHERE ar.status = 'participant'
  GROUP BY ar.affiliate_id, a.affiliate_code, p.full_name
  ORDER BY referrals_count DESC, first_referral_date ASC
  LIMIT 10;
$$;
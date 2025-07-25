-- Zerar ranking atual movendo todos os referrals da semana atual para semana anterior
-- Isso fará com que o ranking comece do zero

UPDATE affiliate_referrals 
SET week_start = date_trunc('week', CURRENT_DATE)::date - INTERVAL '7 days'
WHERE week_start = date_trunc('week', CURRENT_DATE)::date;
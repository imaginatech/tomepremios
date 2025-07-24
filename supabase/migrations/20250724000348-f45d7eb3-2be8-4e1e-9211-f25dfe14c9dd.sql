-- Corrigir lógica de indicações: 1 pessoa = 1 indicação independente de quantos títulos compre

-- 1. Remover registros duplicados, mantendo apenas o mais antigo por usuário
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY referred_user_id 
      ORDER BY created_at ASC
    ) as rn
  FROM affiliate_referrals
)
DELETE FROM affiliate_referrals 
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- 2. Atualizar função de ranking para contar usuários únicos ao invés de registros
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
    COUNT(DISTINCT ar.referred_user_id) as referrals_count, -- DISTINCT para contar usuários únicos
    MIN(ar.created_at) as first_referral_date
  FROM affiliate_referrals ar
  JOIN affiliates a ON a.id = ar.affiliate_id
  JOIN profiles p ON p.id = a.user_id
  WHERE ar.status = 'participant'
  GROUP BY ar.affiliate_id, a.affiliate_code, p.full_name
  ORDER BY referrals_count DESC, first_referral_date ASC
  LIMIT 10;
$$;

-- 3. Atualizar trigger para prevenir duplicatas futuras
CREATE OR REPLACE FUNCTION public.auto_update_referral_to_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_start DATE;
  v_referral_count INTEGER;
BEGIN
  -- Log para debug
  RAISE LOG 'auto_update_referral_to_participant: Ticket % pago para usuário %', 
    NEW.id, NEW.user_id;
  
  -- Se o ticket foi pago
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Verificar se já existe um referral com status 'participant' para este usuário
    SELECT COUNT(*) INTO v_referral_count
    FROM public.affiliate_referrals
    WHERE referred_user_id = NEW.user_id
    AND status = 'participant';
    
    -- Se já existe referral como participant, não fazer nada
    IF v_referral_count > 0 THEN
      RAISE LOG 'auto_update_referral_to_participant: Usuário % já tem referral como participant', NEW.user_id;
      RETURN NEW;
    END IF;
    
    -- Calcular semana atual
    v_week_start := date_trunc('week', CURRENT_DATE)::date;
    
    -- Atualizar apenas UM referral para participant se existir com status registered
    UPDATE public.affiliate_referrals
    SET 
      status = 'participant',
      raffle_id = NEW.raffle_id,
      week_start = v_week_start,
      updated_at = NOW()
    WHERE referred_user_id = NEW.user_id
    AND status = 'registered'
    AND id = (
      SELECT id 
      FROM public.affiliate_referrals 
      WHERE referred_user_id = NEW.user_id 
      AND status = 'registered'
      ORDER BY created_at ASC 
      LIMIT 1
    );
    
    -- Log do resultado
    IF FOUND THEN
      RAISE LOG 'auto_update_referral_to_participant: Referral atualizado para participant para usuário %', NEW.user_id;
    ELSE
      RAISE LOG 'auto_update_referral_to_participant: Nenhum referral encontrado para atualizar para usuário %', NEW.user_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Adicionar constraint para prevenir duplicatas futuras
ALTER TABLE public.affiliate_referrals 
ADD CONSTRAINT unique_user_referral 
UNIQUE (referred_user_id);
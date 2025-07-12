-- FASE 5: FUNÇÃO PARA PROCESSAR DADOS HISTÓRICOS
-- Criar função para corrigir dados históricos de afiliados

CREATE OR REPLACE FUNCTION public.fix_historical_affiliate_data()
RETURNS TABLE(
  action_type TEXT,
  user_id UUID,
  affiliate_code TEXT,
  message TEXT
) AS $$
DECLARE
  rec RECORD;
  affiliate_rec RECORD;
  result_count INTEGER := 0;
BEGIN
  RAISE LOG 'Iniciando correção de dados históricos de afiliados...';
  
  -- Buscar usuários que têm referred_by mas não têm affiliate_referrals
  FOR rec IN 
    SELECT DISTINCT p.id, p.referred_by, p.full_name
    FROM profiles p
    WHERE p.referred_by IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM affiliate_referrals ar 
      WHERE ar.referred_user_id = p.id
    )
  LOOP
    -- Buscar dados do afiliado
    SELECT a.id, a.user_id, a.affiliate_code INTO affiliate_rec
    FROM affiliates a 
    WHERE a.affiliate_code = rec.referred_by 
    AND a.status = 'active';
    
    IF FOUND THEN
      -- Criar o referral que estava faltando
      INSERT INTO affiliate_referrals (
        affiliate_id,
        referred_user_id,
        status
      ) VALUES (
        affiliate_rec.id,
        rec.id,
        'registered'
      );
      
      result_count := result_count + 1;
      
      RETURN QUERY SELECT 
        'REFERRAL_CREATED'::TEXT,
        rec.id,
        rec.referred_by,
        format('Referral criado para usuário %s', rec.full_name);
        
      RAISE LOG 'Referral criado: usuário % indicado por %', rec.id, rec.referred_by;
    ELSE
      RETURN QUERY SELECT 
        'AFFILIATE_NOT_FOUND'::TEXT,
        rec.id,
        rec.referred_by,
        format('Afiliado com código %s não encontrado', rec.referred_by);
        
      RAISE LOG 'Afiliado não encontrado para código: %', rec.referred_by;
    END IF;
  END LOOP;
  
  -- Agora processar tickets pagos de usuários indicados que não geraram bônus
  FOR rec IN
    SELECT DISTINCT rt.user_id, rt.raffle_id, p.referred_by
    FROM raffle_tickets rt
    JOIN profiles p ON p.id = rt.user_id
    WHERE rt.payment_status = 'paid'
    AND p.referred_by IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM affiliates a 
      WHERE a.affiliate_code = p.referred_by 
      AND a.status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM affiliate_referrals ar
      WHERE ar.referred_user_id = rt.user_id
      AND ar.status = 'completed'
      AND ar.raffle_id = rt.raffle_id
    )
  LOOP
    -- Simular o processamento de bônus chamando a trigger manualmente
    RAISE LOG 'Processando ticket histórico: usuário %, sorteio %, afiliado %', 
      rec.user_id, rec.raffle_id, rec.referred_by;
      
    -- Aqui seria ideal chamar a edge function, mas por ora vamos apenas logar
    RETURN QUERY SELECT 
      'BONUS_PENDING'::TEXT,
      rec.user_id,
      rec.referred_by,
      format('Ticket pago pendente de processamento de bônus');
  END LOOP;
  
  RAISE LOG 'Correção de dados históricos concluída. Referrals criados: %', result_count;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
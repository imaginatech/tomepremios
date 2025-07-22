-- Adicionar foreign key entre affiliates.user_id e profiles.id
ALTER TABLE public.affiliates 
ADD CONSTRAINT fk_affiliates_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Melhorar a função de processamento automático de afiliados
CREATE OR REPLACE FUNCTION public.auto_process_affiliate_referral()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_code TEXT;
  v_affiliate_id UUID;
  v_week_start DATE;
BEGIN
  -- Log para debug
  RAISE LOG 'auto_process_affiliate_referral: Processando usuário % com referred_by %', 
    NEW.id, NEW.referred_by;
  
  -- Se referred_by foi preenchido, processar a indicação
  IF NEW.referred_by IS NOT NULL AND (OLD.referred_by IS NULL OR OLD.referred_by != NEW.referred_by) THEN
    
    -- Buscar o afiliado pelo código
    SELECT id INTO v_affiliate_id
    FROM public.affiliates
    WHERE affiliate_code = NEW.referred_by AND status = 'active';
    
    -- Se encontrou o afiliado
    IF v_affiliate_id IS NOT NULL THEN
      
      -- Calcular semana atual
      v_week_start := date_trunc('week', CURRENT_DATE)::date;
      
      -- Verificar se já existe indicação para este usuário
      IF NOT EXISTS (
        SELECT 1 FROM public.affiliate_referrals 
        WHERE referred_user_id = NEW.id
      ) THEN
        
        -- Criar registro de indicação
        INSERT INTO public.affiliate_referrals (
          affiliate_id,
          referred_user_id,
          status,
          week_start
        ) VALUES (
          v_affiliate_id,
          NEW.id,
          'registered',
          v_week_start
        );
        
        RAISE LOG 'auto_process_affiliate_referral: Referral criado para usuário % com afiliado %', 
          NEW.id, NEW.referred_by;
      ELSE
        RAISE LOG 'auto_process_affiliate_referral: Usuário % já possui indicação', NEW.id;
      END IF;
      
    ELSE
      RAISE LOG 'auto_process_affiliate_referral: Afiliado não encontrado para código %', NEW.referred_by;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para processar automaticamente quando referred_by for preenchido
DROP TRIGGER IF EXISTS trigger_auto_process_affiliate_referral ON public.profiles;
CREATE TRIGGER trigger_auto_process_affiliate_referral
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_process_affiliate_referral();

-- Melhorar a função de atualização de status para participant quando ticket é pago
CREATE OR REPLACE FUNCTION public.auto_update_referral_to_participant()
RETURNS TRIGGER AS $$
DECLARE
  v_week_start DATE;
BEGIN
  -- Log para debug
  RAISE LOG 'auto_update_referral_to_participant: Ticket % pago para usuário %', 
    NEW.id, NEW.user_id;
  
  -- Se o ticket foi pago
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Calcular semana atual
    v_week_start := date_trunc('week', CURRENT_DATE)::date;
    
    -- Atualizar referral para participant se existir
    UPDATE public.affiliate_referrals
    SET 
      status = 'participant',
      raffle_id = NEW.raffle_id,
      week_start = v_week_start,
      updated_at = NOW()
    WHERE referred_user_id = NEW.user_id
    AND status = 'registered';
    
    -- Log do resultado
    IF FOUND THEN
      RAISE LOG 'auto_update_referral_to_participant: Referral atualizado para participant para usuário %', NEW.user_id;
    ELSE
      RAISE LOG 'auto_update_referral_to_participant: Nenhum referral encontrado para atualizar para usuário %', NEW.user_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para atualizar status automaticamente quando ticket é pago
DROP TRIGGER IF EXISTS trigger_auto_update_referral_to_participant ON public.raffle_tickets;
CREATE TRIGGER trigger_auto_update_referral_to_participant
  AFTER UPDATE ON public.raffle_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_referral_to_participant();
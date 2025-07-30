-- Função para processar prêmios instantâneos automaticamente
CREATE OR REPLACE FUNCTION public.process_instant_prizes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prize_record RECORD;
BEGIN
  -- Log para debug
  RAISE LOG 'process_instant_prizes: Verificando ticket % do usuário %', NEW.ticket_number, NEW.user_id;
  
  -- Verificar se o ticket foi pago
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Buscar prêmios instantâneos não reivindicados que contenham este número
    FOR prize_record IN 
      SELECT * FROM public.instant_prizes 
      WHERE raffle_id = NEW.raffle_id 
      AND NOT claimed 
      AND NEW.ticket_number = ANY(ticket_numbers)
    LOOP
      
      RAISE LOG 'process_instant_prizes: Prêmio encontrado - ID: %, Valor: %', prize_record.id, prize_record.prize_amount;
      
      -- Atualizar o prêmio como reivindicado
      UPDATE public.instant_prizes
      SET 
        claimed = true,
        claimed_by = NEW.user_id,
        claimed_at = NOW(),
        updated_at = NOW()
      WHERE id = prize_record.id;
      
      RAISE LOG 'process_instant_prizes: Prêmio % reivindicado pelo usuário %', prize_record.id, NEW.user_id;
      
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para processar prêmios instantâneos automaticamente
DROP TRIGGER IF EXISTS trigger_process_instant_prizes ON public.raffle_tickets;
CREATE TRIGGER trigger_process_instant_prizes
  AFTER INSERT OR UPDATE ON public.raffle_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.process_instant_prizes();

-- Processar prêmios já existentes que deveriam ter sido reivindicados
DO $$
DECLARE
  ticket_record RECORD;
  prize_record RECORD;
BEGIN
  -- Buscar tickets pagos que têm números premiados não reivindicados
  FOR ticket_record IN 
    SELECT DISTINCT rt.user_id, rt.ticket_number, rt.raffle_id
    FROM raffle_tickets rt
    JOIN instant_prizes ip ON ip.raffle_id = rt.raffle_id
    WHERE rt.payment_status = 'paid'
    AND ip.claimed = false
    AND rt.ticket_number = ANY(ip.ticket_numbers)
  LOOP
    
    -- Buscar o prêmio correspondente
    FOR prize_record IN 
      SELECT * FROM instant_prizes 
      WHERE raffle_id = ticket_record.raffle_id 
      AND NOT claimed 
      AND ticket_record.ticket_number = ANY(ticket_numbers)
    LOOP
      
      -- Atualizar o prêmio como reivindicado
      UPDATE instant_prizes
      SET 
        claimed = true,
        claimed_by = ticket_record.user_id,
        claimed_at = NOW(),
        updated_at = NOW()
      WHERE id = prize_record.id;
      
      RAISE LOG 'Prêmio histórico % reivindicado pelo usuário %', prize_record.id, ticket_record.user_id;
      
    END LOOP;
    
  END LOOP;
END;
$$;
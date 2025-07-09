-- Criar função para verificar se o sorteio deve ser finalizado
CREATE OR REPLACE FUNCTION check_raffle_completion()
RETURNS TRIGGER AS $$
DECLARE
  raffle_record RECORD;
  sold_count INTEGER;
BEGIN
  -- Buscar informações do sorteio
  SELECT * INTO raffle_record
  FROM public.raffles
  WHERE id = NEW.raffle_id AND status = 'active';
  
  -- Se não encontrou sorteio ativo, não faz nada
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Contar tickets vendidos (apenas com payment_status = 'paid')
  SELECT COUNT(*) INTO sold_count
  FROM public.raffle_tickets
  WHERE raffle_id = NEW.raffle_id AND payment_status = 'paid';
  
  -- Se todos os tickets foram vendidos, chamar a Edge Function
  IF sold_count >= raffle_record.total_tickets THEN
    -- Fazer uma chamada HTTP para a Edge Function
    PERFORM
      net.http_post(
        url := 'https://achsqyusedhegqqgpucu.supabase.co/functions/v1/complete-raffle',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHNxeXVzZWRoZWdxcWdwdWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODgwOTksImV4cCI6MjA2NzU2NDA5OX0.SAC-MRbEmOP_UeP-s5la4VmZ6HDggWaB3GC8SNSokvo"}'::jsonb,
        body := '{}'::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa após inserção ou atualização de ticket
CREATE OR REPLACE TRIGGER trigger_check_raffle_completion
  AFTER INSERT OR UPDATE OF payment_status ON public.raffle_tickets
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION check_raffle_completion();

-- Habilitar extensão pg_net se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Criar trigger para processar bônus de afiliado quando ticket for pago
CREATE OR REPLACE FUNCTION public.trigger_affiliate_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o status mudou para 'paid' 
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Fazer chamada HTTP para a Edge Function process-affiliate-bonus
    PERFORM
      net.http_post(
        url := 'https://achsqyusedhegqqgpucu.supabase.co/functions/v1/process-affiliate-bonus',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHNxeXVzZWRoZWdxcWdwdWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODgwOTksImV4cCI6MjA2NzU2NDA5OX0.SAC-MRbEmOP_UeP-s5la4VmZ6HDggWaB3GC8SNSokvo"}'::jsonb,
        body := json_build_object(
          'type', 'INSERT',
          'table', 'raffle_tickets', 
          'record', row_to_json(NEW),
          'schema', 'public'
        )::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger na tabela raffle_tickets
DROP TRIGGER IF EXISTS on_raffle_ticket_paid ON public.raffle_tickets;

CREATE TRIGGER on_raffle_ticket_paid
  AFTER INSERT OR UPDATE ON public.raffle_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_affiliate_bonus();
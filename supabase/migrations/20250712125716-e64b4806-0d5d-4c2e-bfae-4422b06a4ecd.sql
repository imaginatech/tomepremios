-- Recriar a trigger perdida para processar bônus de afiliado
CREATE TRIGGER on_raffle_ticket_paid
  AFTER INSERT OR UPDATE ON public.raffle_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_affiliate_bonus();
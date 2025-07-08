-- Habilitar realtime para a tabela raffle_tickets
ALTER TABLE public.raffle_tickets REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_tickets;
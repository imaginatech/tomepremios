-- Adicionar os números 43, 44, 45 e 46 para o usuário Matheus Cristovão
INSERT INTO public.raffle_tickets (
  user_id,
  raffle_id,
  ticket_number,
  payment_status
) VALUES 
  ('72d48cac-8de2-435a-b373-c549215fe272', '3a3ab189-c86f-4910-af5b-da681e07140d', 43, 'paid'),
  ('72d48cac-8de2-435a-b373-c549215fe272', '3a3ab189-c86f-4910-af5b-da681e07140d', 44, 'paid'),
  ('72d48cac-8de2-435a-b373-c549215fe272', '3a3ab189-c86f-4910-af5b-da681e07140d', 45, 'paid'),
  ('72d48cac-8de2-435a-b373-c549215fe272', '3a3ab189-c86f-4910-af5b-da681e07140d', 46, 'paid');
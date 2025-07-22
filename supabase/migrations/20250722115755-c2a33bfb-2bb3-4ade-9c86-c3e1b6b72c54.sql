-- Atualizar indicação do Maycon Richard para participant
UPDATE public.affiliate_referrals
SET 
  status = 'participant',
  raffle_id = '3a3ab189-c86f-4910-af5b-da681e07140d',
  week_start = '2025-07-21', -- Ajustar para segunda-feira da semana atual
  updated_at = NOW()
WHERE id = 'f5a6e9b8-e090-4c7f-a2e9-e5d9d8c9a3dd';
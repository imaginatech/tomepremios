-- Marcar o prêmio do número 115 como reivindicado
UPDATE instant_prizes 
SET claimed = true, 
    claimed_by = '0ece7eb9-c035-4b47-9cea-3463a7c990f1', 
    claimed_at = NOW(), 
    updated_at = NOW()
WHERE raffle_id = '9e40891f-8126-4f29-a0e5-7ec3c96fd468' 
AND 115 = ANY(ticket_numbers) 
AND claimed = false;
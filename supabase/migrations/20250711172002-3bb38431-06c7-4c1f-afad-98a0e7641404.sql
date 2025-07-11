-- Alterar tabela pix_payments para Paggue
ALTER TABLE public.pix_payments 
DROP COLUMN IF EXISTS openpix_charge_id,
ADD COLUMN paggue_transaction_id TEXT,
ADD COLUMN paggue_webhook_data JSONB;
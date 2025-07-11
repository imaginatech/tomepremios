-- Criar função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela para rastrear pagamentos PIX
CREATE TABLE public.pix_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  raffle_id UUID NOT NULL,
  selected_numbers INTEGER[] NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  openpix_charge_id TEXT,
  pix_code TEXT,
  qr_code_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

-- Policies para pix_payments
CREATE POLICY "Users can view their own pix payments" 
ON public.pix_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pix payments" 
ON public.pix_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all pix payments" 
ON public.pix_payments 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Função para atualizar updated_at
CREATE TRIGGER update_pix_payments_updated_at
BEFORE UPDATE ON public.pix_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
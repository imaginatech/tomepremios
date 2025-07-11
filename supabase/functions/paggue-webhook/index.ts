import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash, createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaggueWebhookPayload {
  event: string
  data: {
    id: string
    status: string
    amount: number
    paid_at?: string
    [key: string]: any
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook do Paggue recebido');

    const webhookSecret = Deno.env.get('PAGGUE_SIGNATURE_TOKEN');
    
    if (!webhookSecret) {
      console.error('Token de assinatura não configurado');
      return new Response('Signature token not configured', { status: 500 });
    }

    // Verificar assinatura do webhook
    const signature = req.headers.get('X-Paggue-Signature');
    const body = await req.text();
    
    if (signature) {
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Assinatura do webhook inválida');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const payload: PaggueWebhookPayload = JSON.parse(body);
    console.log('Payload do webhook:', payload);

    // Inicializar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Processar apenas eventos de pagamento
    if (payload.event === 'charge.paid' && payload.data.status === 'paid') {
      console.log('Processando pagamento confirmado:', payload.data.id);

      // Buscar pagamento no banco
      const { data: payment, error: paymentError } = await supabase
        .from('pix_payments')
        .select('*')
        .eq('paggue_transaction_id', payload.data.id)
        .single();

      if (paymentError || !payment) {
        console.error('Pagamento não encontrado:', paymentError);
        return new Response('Payment not found', { status: 404 });
      }

      // Atualizar status do pagamento
      const { error: updateError } = await supabase
        .from('pix_payments')
        .update({
          status: 'paid',
          paid_at: payload.data.paid_at || new Date().toISOString(),
          paggue_webhook_data: payload.data
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Erro ao atualizar pagamento:', updateError);
        return new Response('Error updating payment', { status: 500 });
      }

      // Reservar números
      try {
        const { data: reserveResult, error: reserveError } = await supabase
          .rpc('reserve_numbers', {
            p_user_id: payment.user_id,
            p_numbers: payment.selected_numbers
          });

        if (reserveError) {
          console.error('Erro ao reservar números:', reserveError);
          throw reserveError;
        }

        console.log('Números reservados com sucesso:', reserveResult);

        // Processar bônus de afiliado se aplicável
        const { data: profile } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', payment.user_id)
          .single();

        if (profile?.referred_by) {
          console.log('Processando bônus de afiliado para código:', profile.referred_by);
          
          // Chamar edge function para processar bônus
          await supabase.functions.invoke('process-affiliate-bonus', {
            body: {
              referred_user_id: payment.user_id,
              affiliate_code: profile.referred_by,
              raffle_id: payment.raffle_id,
              selected_numbers: payment.selected_numbers
            }
          });
        }

      } catch (error) {
        console.error('Erro no processamento pós-pagamento:', error);
        // Não retornar erro para não fazer o Paggue reenviar o webhook
      }

      console.log('Webhook processado com sucesso');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})